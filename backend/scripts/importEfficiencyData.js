const XLSX = require('xlsx');
const path = require('path');
const db = require('../db');

async function importEmployeeEfficiencyData() {
  try {
    console.log('📊 Importando datos de Employee Efficiency...\n');
    
    // Leer Excel
    const excelPath = path.join(__dirname, '..', '..', 'hackmty', '[HackMTY2025]_EmployeeEfficiency_Dataset_v1.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Excel leído: ${jsonData.length} registros`);
    
    // Crear tabla para efficiency data
    db.exec(`
      CREATE TABLE IF NOT EXISTS efficiency_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id TEXT UNIQUE,
        employee_id TEXT,
        flight_number TEXT,
        spec_id TEXT,
        start_time TEXT,
        end_time TEXT,
        duration_seconds INTEGER,
        accuracy_score TEXT,
        items_packed INTEGER,
        rework_flag TEXT,
        supervisor_notes TEXT,
        inserted_at TEXT DEFAULT (datetime('now'))
      );
    `);
    
    // Limpiar datos existentes
    db.exec('DELETE FROM efficiency_records');
    
    // Insertar datos
    const insertStmt = db.prepare(`
      INSERT INTO efficiency_records (
        record_id, employee_id, flight_number, spec_id, start_time, end_time,
        duration_seconds, accuracy_score, items_packed, rework_flag, supervisor_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let inserted = 0;
    for (const record of jsonData) {
      try {
        insertStmt.run(
          record.Record_ID,
          record.Employee_ID,
          record.Flight_Number,
          record.Spec_ID,
          record.Start_Time,
          record.End_Time,
          record.Duration_Seconds,
          record.Accuracy_Score,
          record.Items_Packed,
          record.Rework_Flag,
          record.Supervisor_Notes || ''
        );
        inserted++;
      } catch (error) {
        console.log(`⚠️ Error insertando ${record.Record_ID}:`, error.message);
      }
    }
    
    console.log(`✅ ${inserted} registros insertados exitosamente`);
    
    // Crear tabla para métricas calculadas
    db.exec(`
      CREATE TABLE IF NOT EXISTS employee_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE,
        total_tasks INTEGER,
        total_duration INTEGER,
        total_items INTEGER,
        completed_tasks INTEGER,
        rework_tasks INTEGER,
        minor_errors INTEGER,
        average_time REAL,
        average_time_per_item REAL,
        accuracy_rate REAL,
        rework_rate REAL,
        efficiency_score REAL,
        last_updated TEXT DEFAULT (datetime('now'))
      );
    `);
    
    // Calcular métricas por empleado
    const employees = db.prepare(`
      SELECT DISTINCT employee_id FROM efficiency_records
    `).all();
    
    const insertMetricsStmt = db.prepare(`
      INSERT OR REPLACE INTO employee_metrics (
        employee_id, total_tasks, total_duration, total_items, completed_tasks,
        rework_tasks, minor_errors, average_time, average_time_per_item,
        accuracy_rate, rework_rate, efficiency_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const emp of employees) {
      const empData = db.prepare(`
        SELECT * FROM efficiency_records WHERE employee_id = ?
      `).all(emp.employee_id);
      
      const metrics = calculateEmployeeMetrics(empData);
      insertMetricsStmt.run(
        emp.employee_id,
        metrics.totalTasks,
        metrics.totalDuration,
        metrics.totalItems,
        metrics.completedTasks,
        metrics.reworkTasks,
        metrics.minorErrors,
        metrics.averageTime,
        metrics.averageTimePerItem,
        metrics.accuracyRate,
        metrics.reworkRate,
        metrics.efficiencyScore
      );
    }
    
    console.log(`✅ Métricas calculadas para ${employees.length} empleados`);
    
    // Mostrar estadísticas
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT employee_id) as total_employees,
        COUNT(DISTINCT flight_number) as total_flights,
        COUNT(DISTINCT spec_id) as total_specs,
        AVG(duration_seconds) as avg_duration,
        AVG(items_packed) as avg_items,
        SUM(CASE WHEN rework_flag = 'Yes' THEN 1 ELSE 0 END) as rework_count
      FROM efficiency_records
    `).get();
    
    console.log('\n📈 Estadísticas de los datos:');
    console.log(`  Total registros: ${stats.total_records}`);
    console.log(`  Total empleados: ${stats.total_employees}`);
    console.log(`  Total vuelos: ${stats.total_flights}`);
    console.log(`  Total especificaciones: ${stats.total_specs}`);
    console.log(`  Duración promedio: ${stats.avg_duration.toFixed(1)} segundos`);
    console.log(`  Items promedio: ${stats.avg_items.toFixed(1)}`);
    console.log(`  Registros con rework: ${stats.rework_count} (${(stats.rework_count/stats.total_records*100).toFixed(1)}%)`);
    
    return {
      success: true,
      recordsInserted: inserted,
      employeesProcessed: employees.length,
      stats
    };
    
  } catch (error) {
    console.error('❌ Error importando datos:', error);
    return { success: false, error: error.message };
  }
}

function calculateEmployeeMetrics(records) {
  const metrics = {
    totalTasks: records.length,
    totalDuration: 0,
    totalItems: 0,
    completedTasks: 0,
    reworkTasks: 0,
    minorErrors: 0,
    averageTime: 0,
    averageTimePerItem: 0,
    accuracyRate: 0,
    reworkRate: 0,
    efficiencyScore: 0
  };
  
  records.forEach(record => {
    metrics.totalDuration += record.duration_seconds;
    metrics.totalItems += record.items_packed;
    
    if (record.accuracy_score === 'Pass') {
      metrics.completedTasks++;
    } else if (record.accuracy_score === 'Rework Required') {
      metrics.reworkTasks++;
    } else if (record.accuracy_score === 'Minor Error') {
      metrics.minorErrors++;
    }
  });
  
  // Calcular métricas derivadas
  metrics.averageTime = metrics.totalDuration / metrics.totalTasks;
  metrics.averageTimePerItem = metrics.totalDuration / metrics.totalItems;
  metrics.accuracyRate = metrics.completedTasks / metrics.totalTasks;
  metrics.reworkRate = metrics.reworkTasks / metrics.totalTasks;
  metrics.efficiencyScore = calculateEfficiencyScore(metrics);
  
  return metrics;
}

function calculateEfficiencyScore(metrics) {
  let score = 100;
  
  // Penalizar por tiempo promedio alto
  if (metrics.averageTime > 60) score -= 20;
  else if (metrics.averageTime > 40) score -= 10;
  
  // Penalizar por tasa de re-trabajo
  if (metrics.reworkRate > 0.2) score -= 30;
  else if (metrics.reworkRate > 0.1) score -= 15;
  
  // Penalizar por errores menores
  if (metrics.minorErrors > 3) score -= 10;
  
  // Bonificar por alta precisión
  if (metrics.accuracyRate > 0.9) score += 10;
  
  return Math.max(0, Math.min(100, score));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  importEmployeeEfficiencyData().then(result => {
    if (result.success) {
      console.log('\n✅ Importación completada exitosamente');
    } else {
      console.log('\n❌ Error en la importación');
    }
  });
}

module.exports = importEmployeeEfficiencyData;

