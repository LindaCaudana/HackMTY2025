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
      .slice(-10); // Últimos 10 registros

    res.json({
      employeeId,
      metrics,
      recentRecords: employeeRecords
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

module.exports = router;