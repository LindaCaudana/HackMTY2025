// backend/routes/efficiency.js
const express = require('express');
const router = express.Router();
const efficiencyService = require('../services/EfficiencyService');

// Obtener métricas del dashboard
router.get('/metrics', (req, res) => {
  try {
    const metrics = efficiencyService.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener ranking de empleados
router.get('/ranking', (req, res) => {
  try {
    const ranking = efficiencyService.getEmployeeRanking();
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener recomendaciones de training
router.get('/training-recommendations', (req, res) => {
  try {
    const recommendations = efficiencyService.getTrainingRecommendations();
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar nuevo registro de packing
router.post('/packing-record', (req, res) => {
  try {
    const record = req.body;
    const newRecord = efficiencyService.addPackingRecord(record);
    res.json({
      success: true,
      record: newRecord,
      message: 'Packing record added successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener datos de un empleado específico
router.get('/employee/:employeeId', (req, res) => {
  try {
    const { employeeId } = req.params;
    const metrics = efficiencyService.employeeMetrics[employeeId];
    
    if (!metrics) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeRecords = efficiencyService.packingRecords
      .filter(record => record.employeeId === employeeId)
      .slice(-20); // Últimos 20 registros

    res.json({
      employeeId,
      metrics,
      recentRecords: employeeRecords
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las tareas de un empleado específico
router.get('/employee/:employeeId/tasks', (req, res) => {
  try {
    const { employeeId } = req.params;
    const db = require('../db');
    
    const tasks = db.prepare(`
      SELECT 
        record_id as recordId,
        employee_id as employeeId,
        flight_number as flightNumber,
        spec_id as specId,
        start_time as startTime,
        end_time as endTime,
        duration_seconds as durationSeconds,
        accuracy_score as accuracyScore,
        items_packed as itemsPacked,
        CASE WHEN rework_flag = 'Yes' THEN true ELSE false END as reworkFlag,
        supervisor_notes as supervisorNotes
      FROM efficiency_records
      WHERE employee_id = ?
      ORDER BY start_time DESC
    `).all(employeeId);

    res.json({
      employeeId,
      tasks,
      totalTasks: tasks.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simular nuevo dato en tiempo real
router.post('/simulate-record', (req, res) => {
  try {
    const mockRecords = [
      {
        employeeId: 'EMP012',
        flightNumber: 'LX730',
        specId: 'SPEC_C02',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 35 * 1000).toISOString(),
        durationSeconds: 35,
        accuracyScore: 'Pass',
        itemsPacked: 13,
        reworkFlag: false,
        supervisorNotes: 'Good performance'
      },
      {
        employeeId: 'EMP018',
        flightNumber: 'LX726',
        specId: 'SPEC_D01',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 50 * 1000).toISOString(),
        durationSeconds: 50,
        accuracyScore: 'Minor Error',
        itemsPacked: 14,
        reworkFlag: false,
        supervisorNotes: 'Layout confusion'
      },
      {
        employeeId: 'EMP004',
        flightNumber: 'LX735',
        specId: 'SPEC_B01',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 28 * 1000).toISOString(),
        durationSeconds: 28,
        accuracyScore: 'Pass',
        itemsPacked: 15,
        reworkFlag: false,
        supervisorNotes: 'Excellent speed'
      }
    ];

    const randomRecord = mockRecords[Math.floor(Math.random() * mockRecords.length)];
    const newRecord = efficiencyService.addPackingRecord(randomRecord);
    
    res.json({
      success: true,
      record: newRecord,
      message: 'Simulated packing record added'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener análisis detallado por vuelo
router.get('/flight-analysis', (req, res) => {
  try {
    const db = require('../db');
    const flightAnalysis = db.prepare(`
      SELECT 
        flight_number,
        COUNT(*) as total_tasks,
        AVG(duration_seconds) as avg_duration,
        AVG(items_packed) as avg_items,
        SUM(CASE WHEN rework_flag = 'Yes' THEN 1 ELSE 0 END) as rework_count,
        SUM(CASE WHEN accuracy_score = 'Pass' THEN 1 ELSE 0 END) as pass_count,
        COUNT(DISTINCT employee_id) as unique_employees,
        COUNT(DISTINCT spec_id) as unique_specs
      FROM efficiency_records
      GROUP BY flight_number
      ORDER BY avg_duration ASC
    `).all();
    
    res.json(flightAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener análisis por especificación
router.get('/spec-analysis', (req, res) => {
  try {
    const db = require('../db');
    const specAnalysis = db.prepare(`
      SELECT 
        spec_id,
        COUNT(*) as total_tasks,
        AVG(duration_seconds) as avg_duration,
        AVG(items_packed) as avg_items,
        SUM(CASE WHEN rework_flag = 'Yes' THEN 1 ELSE 0 END) as rework_count,
        SUM(CASE WHEN accuracy_score = 'Pass' THEN 1 ELSE 0 END) as pass_count,
        COUNT(DISTINCT employee_id) as unique_employees,
        COUNT(DISTINCT flight_number) as unique_flights
      FROM efficiency_records
      GROUP BY spec_id
      ORDER BY avg_duration ASC
    `).all();
    
    res.json(specAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tendencias temporales
router.get('/time-trends', (req, res) => {
  try {
    const db = require('../db');
    const timeTrends = db.prepare(`
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as total_tasks,
        AVG(duration_seconds) as avg_duration,
        SUM(CASE WHEN rework_flag = 'Yes' THEN 1 ELSE 0 END) as rework_count,
        COUNT(DISTINCT employee_id) as active_employees
      FROM efficiency_records
      GROUP BY DATE(start_time)
      ORDER BY date ASC
    `).all();
    
    res.json(timeTrends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener análisis de rendimiento por hora del día
router.get('/hourly-performance', (req, res) => {
  try {
    const db = require('../db');
    const hourlyPerformance = db.prepare(`
      SELECT 
        CAST(SUBSTR(start_time, 12, 2) AS INTEGER) as hour,
        COUNT(*) as total_tasks,
        AVG(duration_seconds) as avg_duration,
        SUM(CASE WHEN rework_flag = 'Yes' THEN 1 ELSE 0 END) as rework_count,
        COUNT(DISTINCT employee_id) as active_employees
      FROM efficiency_records
      GROUP BY CAST(SUBSTR(start_time, 12, 2) AS INTEGER)
      ORDER BY hour ASC
    `).all();
    
    res.json(hourlyPerformance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas generales mejoradas
router.get('/enhanced-stats', (req, res) => {
  try {
    const db = require('../db');
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT employee_id) as total_employees,
        COUNT(DISTINCT flight_number) as total_flights,
        COUNT(DISTINCT spec_id) as total_specs,
        AVG(duration_seconds) as avg_duration,
        MIN(duration_seconds) as min_duration,
        MAX(duration_seconds) as max_duration,
        AVG(items_packed) as avg_items,
        SUM(CASE WHEN rework_flag = 'Yes' THEN 1 ELSE 0 END) as total_rework,
        SUM(CASE WHEN accuracy_score = 'Pass' THEN 1 ELSE 0 END) as total_passes,
        SUM(CASE WHEN accuracy_score = 'Minor Error' THEN 1 ELSE 0 END) as total_minor_errors,
        SUM(CASE WHEN accuracy_score = 'Rework Required' THEN 1 ELSE 0 END) as total_rework_required
      FROM efficiency_records
    `).get();
    
    // Calcular porcentajes
    const percentages = {
      reworkRate: (stats.total_rework / stats.total_records) * 100,
      passRate: (stats.total_passes / stats.total_records) * 100,
      minorErrorRate: (stats.total_minor_errors / stats.total_records) * 100,
      reworkRequiredRate: (stats.total_rework_required / stats.total_records) * 100
    };
    
    res.json({
      ...stats,
      percentages,
      efficiency: {
        avgItemsPerMinute: (stats.avg_items / (stats.avg_duration / 60)).toFixed(2),
        avgDurationPerItem: (stats.avg_duration / stats.avg_items).toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refrescar datos del servicio
router.post('/refresh-data', (req, res) => {
  try {
    efficiencyService.refreshData();
    res.json({ 
      success: true, 
      message: 'Datos refrescados exitosamente',
      recordsCount: efficiencyService.packingRecords.length,
      employeesCount: Object.keys(efficiencyService.employeeMetrics).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;