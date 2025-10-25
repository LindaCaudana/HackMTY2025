import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ErrorDashboard.css';

interface DashboardMetrics {
  totalReadings: number;
  totalAlerts: number;
  activeAlerts: number;
  overallErrorRate: number;
  problematicStations: Array<{
    stationId: string;
    errorRate: number;
    alertCount: number;
    lastAlert: string;
  }>;
  recentAlerts: Array<any>;
  stationMetrics: any;
}

const ErrorDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('https://hackmty2025.onrender.com/api/error-detection/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateData = async () => {
    try {
      await axios.post('https://hackmty2025.onrender.com/api/error-detection/simulate');
      alert('Real-time data simulation started!');
    } catch (error) {
      console.error('Error simulating data:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return <div className="loading">Loading Error Dashboard...</div>;
  }

  return (
    <div className="error-dashboard">
      <div className="dashboard-header">
        <h1>🔍 Real-Time Error Detection</h1>
        <div className="dashboard-controls">
          <button 
            className={`btn ${autoRefresh ? 'btn-success' : 'btn-outline-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button className="btn btn-primary" onClick={simulateData}>
            Simulate Real-time Data
          </button>
          <button className="btn btn-outline-primary" onClick={fetchMetrics}>
            Refresh Now
          </button>
        </div>
      </div>

      {metrics && (
        <div className="metrics-panel">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <h3>{metrics.totalReadings}</h3>
                <p>Total Readings</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🚨</div>
              <div className="metric-content">
                <h3 className={metrics.activeAlerts > 0 ? 'text-danger' : 'text-success'}>
                  {metrics.activeAlerts}
                </h3>
                <p>Active Alerts</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">⚠️</div>
              <div className="metric-content">
                <h3>{metrics.totalAlerts}</h3>
                <p>Total Alerts</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <h3 className={metrics.overallErrorRate > 0.1 ? 'text-warning' : 'text-success'}>
                  {(metrics.overallErrorRate * 100).toFixed(1)}%
                </h3>
                <p>Error Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {metrics && metrics.recentAlerts.length > 0 && (
        <div className="alerts-section">
          <h3>Recent Alerts</h3>
          <div className="alerts-container">
            {metrics.recentAlerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <div className="alert-header">
                  <span className="alert-level">{alert.level}</span>
                  <span className="alert-time">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-details">
                  <span>Station: {alert.stationId}</span>
                  <span>Type: {alert.sensorType}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorDashboard;