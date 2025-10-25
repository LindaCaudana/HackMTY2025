import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EfficiencyDashboard.css';

interface DashboardMetrics {
  totalEmployees: number;
  totalTasks: number;
  totalRework: number;
  reworkRate: number;
  averageEfficiency: number;
  topPerformers: Array<{
    employeeId: string;
    efficiencyScore: number;
    averageTime: number;
    accuracyRate: number;
    totalTasks: number;
    reworkRate: number;
  }>;
  trainingRecommendations: Array<{
    employeeId: string;
    priority: string;
    issue: string;
    recommendation: string;
    score: number;
  }>;
}

const EfficiencyDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('https://hackmty2025.onrender.com/api/efficiency/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateRecord = async () => {
    try {
      await axios.post('https://hackmty2025.onrender.com/api/efficiency/simulate-record');
      await fetchMetrics(); // Refresh metrics after simulation
    } catch (error) {
      console.error('Error simulating record:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const getEfficiencyColor = (score: number) => {
    if (score >= 90) return 'efficiency-excellent';
    if (score >= 80) return 'efficiency-good';
    if (score >= 70) return 'efficiency-fair';
    return 'efficiency-poor';
  };

  if (loading) {
    return <div className="loading">Loading Employee Efficiency Dashboard...</div>;
  }

  return (
    <div className="efficiency-dashboard">
      <div className="dashboard-header">
        <h1>👥 Employee Efficiency Analytics</h1>
        <div className="dashboard-controls">
          <button 
            className={`btn ${autoRefresh ? 'btn-success' : 'btn-outline-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button className="btn btn-primary" onClick={simulateRecord}>
            Simulate New Record
          </button>
          <button className="btn btn-outline-primary" onClick={fetchMetrics}>
            Refresh Now
          </button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Metrics Overview */}
          <div className="metrics-overview">
            <div className="metric-card">
              <div className="metric-icon">👥</div>
              <div className="metric-content">
                <h3>{metrics.totalEmployees}</h3>
                <p>Total Employees</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <h3>{metrics.totalTasks}</h3>
                <p>Total Tasks</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🔄</div>
              <div className="metric-content">
                <h3 className={metrics.reworkRate > 0.1 ? 'text-warning' : 'text-success'}>
                  {(metrics.reworkRate * 100).toFixed(1)}%
                </h3>
                <p>Rework Rate</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">⭐</div>
              <div className="metric-content">
                <h3 className={getEfficiencyColor(metrics.averageEfficiency)}>
                  {metrics.averageEfficiency}%
                </h3>
                <p>Avg Efficiency</p>
              </div>
            </div>
          </div>

          <div className="dashboard-content">
            {/* Top Performers */}
            <div className="content-section">
              <h3>🏆 Top Performers</h3>
              <div className="performers-list">
                {metrics.topPerformers.map((employee, index) => (
                  <div key={employee.employeeId} className="performer-card">
                    <div className="rank">#{index + 1}</div>
                    <div className="employee-info">
                      <h4>{employee.employeeId}</h4>
                      <div className="employee-metrics">
                        <span className={`score ${getEfficiencyColor(employee.efficiencyScore)}`}>
                          {employee.efficiencyScore}%
                        </span>
                        <span>Time: {employee.averageTime}s</span>
                        <span>Accuracy: {(employee.accuracyRate * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Training Recommendations */}
            <div className="content-section">
              <h3>🎯 Training Recommendations</h3>
              <div className="recommendations-list">
                {metrics.trainingRecommendations.length === 0 ? (
                  <div className="no-recommendations">
                    <p>No training recommendations needed</p>
                    <small>All employees are performing well</small>
                  </div>
                ) : (
                  metrics.trainingRecommendations.map((rec, index) => (
                    <div key={index} className={`recommendation-card ${getPriorityColor(rec.priority)}`}>
                      <div className="recommendation-header">
                        <span className="employee-id">{rec.employeeId}</span>
                        <span className="priority-badge">{rec.priority}</span>
                      </div>
                      <div className="recommendation-content">
                        <p className="issue"><strong>Issue:</strong> {rec.issue}</p>
                        <p className="recommendation"><strong>Action:</strong> {rec.recommendation}</p>
                      </div>
                      <div className="efficiency-score">
                        Efficiency: <span className={getEfficiencyColor(rec.score)}>{rec.score}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EfficiencyDashboard;