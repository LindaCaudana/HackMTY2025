// backend/services/ErrorDetectionService.js
class ErrorDetectionService {
  constructor() {
    this.sensorReadings = [];
    this.alerts = [];
    this.stationMetrics = {};
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
        condition: (r) => r.deviationScore > 0.7,
        level: 'HIGH',
        message: `High deviation detected: ${reading.deviationScore}`,
        type: 'DEVIATION'
      },
      {
        condition: (r) => r.deviationScore > 0.3 && r.deviationScore <= 0.7,
        level: 'MEDIUM', 
        message: `Medium deviation: ${reading.deviationScore}`,
        type: 'DEVIATION'
      },
      {
        condition: (r) => r.sensorType === 'Camera' && r.detectedValue === 'Extra_Item',
        level: 'MEDIUM',
        message: 'Extra item detected in layout',
        type: 'LAYOUT_ERROR'
      },
      {
        condition: (r) => r.sensorType === 'Weight' && Math.abs(parseFloat(r.expectedValue) - parseFloat(r.detectedValue)) > 0.5,
        level: 'HIGH',
        message: 'Significant weight discrepancy',
        type: 'WEIGHT_ERROR'
      }
    ];

    for (const rule of rules) {
      if (rule.condition(reading)) {
        return {
          id: Date.now() + Math.random(),
          stationId: reading.stationId,
          drawerId: reading.drawerId,
          level: rule.level,
          message: rule.message,
          type: rule.type,
          sensorType: reading.sensorType,
          timestamp: new Date().toISOString(),
          reading: reading
        };
      }
    }

    return null;
  }

  // Actualizar métricas por estación
  updateStationMetrics(reading) {
    const stationId = reading.stationId;
    
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
    metrics.sensorTypes.add(reading.sensorType);

    if (reading.deviationScore > 0.3) {
      metrics.alertCount++;
      metrics.lastAlert = new Date().toISOString();
    }

    metrics.errorRate = metrics.alertCount / metrics.totalReadings;
  }

  // Obtener dashboard metrics
  getDashboardMetrics() {
    const totalReadings = this.sensorReadings.length;
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

    return {
      totalReadings,
      totalAlerts,
      activeAlerts: activeAlerts.length,
      overallErrorRate: totalReadings > 0 ? totalAlerts / totalReadings : 0,
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