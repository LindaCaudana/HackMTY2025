// backend/services/ErrorDetectionService.js
const db = require('../db');

class ErrorDetectionService {
  constructor() {
    this.sensorReadings = [];
    this.alerts = [];
    this.stationMetrics = {};
  }

  // Obtener datos de la base de datos
  getDataFromDatabase() {
    try {
      const stmt = db.prepare('SELECT * FROM realtime_error_items ORDER BY id DESC LIMIT 100');
      const rows = stmt.all();
      return rows.map(row => JSON.parse(row.data));
    } catch (error) {
      console.error('Error reading from database:', error);
      return [];
    }
  }

  // Procesar lectura de sensor en tiempo real
  processSensorReading(reading) {
    const readingWithId = {
      ...reading,
      id: Date.now() + Math.random(),
      processedAt: new Date().toISOString()
    };
    
    this.sensorReadings.push(readingWithId);

    // Analizar si es una alerta
    const alert = this.analyzeForAlerts(readingWithId);
    if (alert) {
      this.alerts.push(alert);
    }

    // Actualizar métricas de estación
    this.updateStationMetrics(readingWithId);

    return alert;
  }

  // Analizar lectura para detectar alertas
  analyzeForAlerts(reading) {
    const rules = [
      {
        condition: (r) => r.Deviation_Score > 0.7 || (parseFloat(r.Deviation_Score) || 0) > 0.7,
        level: 'HIGH',
        message: `High deviation detected: ${r.Deviation_Score}`,
        type: 'DEVIATION'
      },
      {
        condition: (r) => (r.Deviation_Score > 0.3 && r.Deviation_Score <= 0.7) || (parseFloat(r.Deviation_Score) || 0) > 0.3,
        level: 'MEDIUM', 
        message: `Medium deviation: ${r.Deviation_Score}`,
        type: 'DEVIATION'
      },
      {
        condition: (r) => r.Alert_Flag === 1 || r.Alert_Flag === '1' || r.Alert_Flag === true,
        level: 'HIGH',
        message: 'Alert flag detected',
        type: 'ALERT_FLAG'
      }
    ];

    for (const rule of rules) {
      if (rule.condition(reading)) {
        return {
          id: Date.now() + Math.random(),
          stationId: reading.Station_ID || reading.stationId || 'UNKNOWN',
          drawerId: reading.Drawer_ID || reading.drawerId || 'UNKNOWN',
          level: rule.level,
          message: rule.message,
          type: rule.type,
          sensorType: reading.Sensor_Type || reading.sensorType || 'UNKNOWN',
          timestamp: reading.Timestamp || reading.timestamp || new Date().toISOString(),
          reading: reading
        };
      }
    }

    return null;
  }

  // Actualizar métricas por estación
  updateStationMetrics(reading) {
    const stationId = reading.Station_ID || reading.stationId || 'UNKNOWN';
    
    if (!this.stationMetrics[stationId]) {
      this.stationMetrics[stationId] = {
        totalReadings: 0,
        alertCount: 0,
        errorRate: 0,
        lastAlert: null,
        sensorTypes: new Set()
      };
    }

    const metrics = this.stationMetrics[stationId];
    metrics.totalReadings++;
    const sensorType = reading.Sensor_Type || reading.sensorType || 'UNKNOWN';
    metrics.sensorTypes.add(sensorType);

    const deviationScore = parseFloat(reading.Deviation_Score || reading.deviationScore || 0);
    const alertFlag = reading.Alert_Flag === 1 || reading.Alert_Flag === '1' || reading.Alert_Flag === true;

    if (alertFlag || deviationScore > 0.3) {
      metrics.alertCount++;
      metrics.lastAlert = reading.Timestamp || reading.timestamp || new Date().toISOString();
    }

    metrics.errorRate = metrics.alertCount / metrics.totalReadings;
  }

  // Obtener dashboard metrics
  getDashboardMetrics() {
    // Reiniciar métricas y alertas para procesar datos frescos desde BD
    this.alerts = [];
    this.stationMetrics = {};
    
    // Obtener datos de la base de datos
    const dbReadings = this.getDataFromDatabase();
    
    // Procesar todas las lecturas para generar alertas y métricas
    dbReadings.forEach(reading => {
      const alert = this.analyzeForAlerts(reading);
      if (alert) {
        this.alerts.push(alert);
      }
      this.updateStationMetrics(reading);
    });

    const totalReadings = dbReadings.length;
    const totalAlerts = this.alerts.length;
    const activeAlerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > new Date(Date.now() - 30 * 60 * 1000) // Últimos 30 min
    );

    const problematicStations = Object.entries(this.stationMetrics)
      .filter(([_, metrics]) => metrics.errorRate > 0.1)
      .map(([stationId, metrics]) => ({
        stationId,
        errorRate: metrics.errorRate,
        alertCount: metrics.alertCount,
        lastAlert: metrics.lastAlert
      }));

    // Calcular tasa de error basada en alert_flag de la base de datos
    const alertFlagsCount = dbReadings.filter(r => r.Alert_Flag === 1 || r.Alert_Flag === '1').length;
    const overallErrorRate = totalReadings > 0 ? alertFlagsCount / totalReadings : 0;

    return {
      totalReadings,
      totalAlerts,
      activeAlerts: activeAlerts.length,
      overallErrorRate: overallErrorRate,
      problematicStations,
      recentAlerts: this.alerts.slice(-10).reverse(),
      stationMetrics: this.stationMetrics
    };
  }

  // Obtener datos mock del dataset
  getMockSensorData() {
    return [
      {
        streamId: 'PK01_STREAM',
        timestamp: new Date().toISOString(),
        stationId: 'PK01',
        drawerId: 'DRW_013',
        specId: 'SPEC_20251013_14',
        sensorType: 'Camera',
        expectedValue: 'Layout_OK',
        detectedValue: 'Layout_OK',
        deviationScore: 0,
        operatorId: 'EMP044',
        flightNumber: 'QR117',
        customerName: 'Qatar Airways'
      },
      {
        streamId: 'PK01_STREAM', 
        timestamp: new Date().toISOString(),
        stationId: 'PK01',
        drawerId: 'DRW_033',
        specId: 'SPEC_20251013_01',
        sensorType: 'Weight',
        expectedValue: '4.71 kg',
        detectedValue: '4.4 kg',
        deviationScore: 0.66,
        operatorId: 'EMP058',
        flightNumber: 'LX321',
        customerName: 'Swiss International Air Lines'
      }
    ];
  }

  // Simular datos en tiempo real para demo
  simulateRealTimeData() {
    const mockReadings = this.getMockSensorData();
    mockReadings.forEach((reading, index) => {
      setTimeout(() => {
        this.processSensorReading(reading);
      }, index * 2000); // Cada 2 segundos
    });
  }
}

module.exports = new ErrorDetectionService();