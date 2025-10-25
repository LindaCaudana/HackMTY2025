// backend/services/EfficiencyService.js
class EfficiencyService {
  constructor() {
    this.packingRecords = [];
    this.employeeMetrics = {};
    this.initializeMockData();
  }

  // Inicializar con datos mock del dataset
  initializeMockData() {
    this.packingRecords = [
      {
        recordId: 'PKG001',
        employeeId: 'EMP004',
        flightNumber: 'LX721',
        specId: 'SPEC_C01',
        startTime: '2025-10-13 07:36:52',
        endTime: '2025-10-13 07:37:35',
        durationSeconds: 43,
        accuracyScore: 'Pass',
        itemsPacked: 11,
        reworkFlag: false,
        supervisorNotes: ''
      },
      {
        recordId: 'PKG002',
        employeeId: 'EMP018',
        flightNumber: 'LX726',
        specId: 'SPEC_D01',
        startTime: '2025-10-13 06:38:40',
        endTime: '2025-10-13 06:38:58',
        durationSeconds: 18,
        accuracyScore: 'Rework Required',
        itemsPacked: 14,
        reworkFlag: true,
        supervisorNotes: 'Layout confusion'
      },
      {
        recordId: 'PKG003',
        employeeId: 'EMP008',
        flightNumber: 'LX755',
        specId: 'SPEC_A01',
        startTime: '2025-10-13 09:03:15',
        endTime: '2025-10-13 09:03:55',
        durationSeconds: 40,
        accuracyScore: 'Minor Error',
        itemsPacked: 15,
        reworkFlag: false,
        supervisorNotes: ''
      },
      {
        recordId: 'PKG004',
        employeeId: 'EMP012',
        flightNumber: 'LX760',
        specId: 'SPEC_B02',
        startTime: '2025-10-13 06:48:59',
        endTime: '2025-10-13 06:49:19',
        durationSeconds: 20,
        accuracyScore: 'Minor Error',
        itemsPacked: 17,
        reworkFlag: false,
        supervisorNotes: 'Missing one snack item'
      },
      {
        recordId: 'PKG005',
        employeeId: 'EMP005',
        flightNumber: 'LX733',
        specId: 'SPEC_D03',
        startTime: '2025-10-13 08:57:10',
        endTime: '2025-10-13 08:57:58',
        durationSeconds: 48,
        accuracyScore: 'Pass',
        itemsPacked: 16,
        reworkFlag: false,
        supervisorNotes: 'Improved speed'
      }
    ];
    this.calculateAllMetrics();
  }

  // Calcular métricas para todos los empleados
  calculateAllMetrics() {
    this.employeeMetrics = {};
    
    this.packingRecords.forEach(record => {
      const empId = record.employeeId;
      
      if (!this.employeeMetrics[empId]) {
        this.employeeMetrics[empId] = {
          totalTasks: 0,
          totalDuration: 0,
          totalItems: 0,
          completedTasks: 0,
          reworkTasks: 0,
          minorErrors: 0,
          accuracyScore: 0,
          averageTimePerItem: 0,
          commonIssues: new Set()
        };
      }

      const metrics = this.employeeMetrics[empId];
      metrics.totalTasks++;
      metrics.totalDuration += record.durationSeconds;
      metrics.totalItems += record.itemsPacked;

      if (record.accuracyScore === 'Pass') {
        metrics.completedTasks++;
      } else if (record.accuracyScore === 'Rework Required') {
        metrics.reworkTasks++;
      } else if (record.accuracyScore === 'Minor Error') {
        metrics.minorErrors++;
      }

      if (record.supervisorNotes) {
        metrics.commonIssues.add(record.supervisorNotes);
      }
    });

    // Calcular métricas derivadas
    Object.keys(this.employeeMetrics).forEach(empId => {
      const metrics = this.employeeMetrics[empId];
      metrics.averageTime = metrics.totalDuration / metrics.totalTasks;
      metrics.averageTimePerItem = metrics.totalDuration / metrics.totalItems;
      metrics.accuracyRate = metrics.completedTasks / metrics.totalTasks;
      metrics.reworkRate = metrics.reworkTasks / metrics.totalTasks;
      metrics.efficiencyScore = this.calculateEfficiencyScore(metrics);
    });
  }

  // Calcular score de eficiencia (0-100)
  calculateEfficiencyScore(metrics) {
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

  // Obtener dashboard metrics
  getDashboardMetrics() {
    const totalEmployees = Object.keys(this.employeeMetrics).length;
    const totalTasks = this.packingRecords.length;
    const totalRework = this.packingRecords.filter(r => r.reworkFlag).length;
    const avgEfficiency = Object.values(this.employeeMetrics)
      .reduce((sum, m) => sum + m.efficiencyScore, 0) / totalEmployees;

    const topPerformers = this.getEmployeeRanking().slice(0, 3);
    const needTraining = this.getTrainingRecommendations().slice(0, 5);

    return {
      totalEmployees,
      totalTasks,
      totalRework,
      reworkRate: totalTasks > 0 ? totalRework / totalTasks : 0,
      averageEfficiency: avgEfficiency,
      topPerformers,
      trainingRecommendations: needTraining,
      employeeMetrics: this.employeeMetrics
    };
  }

  // Obtener ranking de empleados
  getEmployeeRanking() {
    return Object.entries(this.employeeMetrics)
      .map(([employeeId, metrics]) => ({
        employeeId,
        efficiencyScore: metrics.efficiencyScore,
        averageTime: metrics.averageTime,
        accuracyRate: metrics.accuracyRate,
        totalTasks: metrics.totalTasks,
        reworkRate: metrics.reworkRate
      }))
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  }

  // Generar recomendaciones de training
  getTrainingRecommendations() {
    const recommendations = [];

    Object.entries(this.employeeMetrics).forEach(([employeeId, metrics]) => {
      if (metrics.reworkRate > 0.2) {
        recommendations.push({
          employeeId,
          priority: 'HIGH',
          issue: 'High rework rate',
          recommendation: 'Intensive layout training required',
          score: metrics.efficiencyScore
        });
      }

      if (metrics.averageTime > 60) {
        recommendations.push({
          employeeId,
          priority: 'MEDIUM',
          issue: 'Slow packing speed',
          recommendation: 'Efficiency and time management training',
          score: metrics.efficiencyScore
        });
      }

      if (metrics.accuracyRate < 0.7) {
        recommendations.push({
          employeeId,
          priority: 'HIGH',
          issue: 'Low accuracy rate',
          recommendation: 'Quality control and attention to detail training',
          score: metrics.efficiencyScore
        });
      }

      if (Array.from(metrics.commonIssues).some(issue => 
        issue.includes('Layout confusion') || issue.includes('Layout unclear'))) {
        recommendations.push({
          employeeId,
          priority: 'MEDIUM',
          issue: 'Layout understanding issues',
          recommendation: 'Visual layout training and reference materials',
          score: metrics.efficiencyScore
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || b.score - a.score;
    });
  }

  // Agregar nuevo registro de packing
  addPackingRecord(record) {
    record.recordId = `PKG${String(this.packingRecords.length + 1).padStart(3, '0')}`;
    this.packingRecords.push(record);
    this.calculateAllMetrics();
    return record;
  }
}

module.exports = new EfficiencyService();