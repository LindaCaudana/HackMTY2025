// backend/routes/errorDetection.js
const express = require('express');
const router = express.Router();
const errorDetectionService = require('../services/ErrorDetectionService');

// Obtener métricas del dashboard
router.get('/metrics', (req, res) => {
  try {
    const metrics = errorDetectionService.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Procesar nueva lectura de sensor
router.post('/sensor-reading', (req, res) => {
  try {
    const reading = req.body;
    const alert = errorDetectionService.processSensorReading(reading);
    
    res.json({
      success: true,
      alert: alert,
      message: alert ? 'Alert generated' : 'Reading processed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener alertas recientes
router.get('/alerts', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const alerts = errorDetectionService.alerts.slice(-limit).reverse();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener datos mock para desarrollo
router.get('/mock-data', (req, res) => {
  try {
    const mockData = errorDetectionService.getMockSensorData();
    res.json(mockData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simular datos en tiempo real
router.post('/simulate', (req, res) => {
  try {
    errorDetectionService.simulateRealTimeData();
    res.json({ message: 'Real-time data simulation started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;