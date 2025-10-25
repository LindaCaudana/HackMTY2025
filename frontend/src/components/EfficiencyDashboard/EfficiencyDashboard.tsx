import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EfficiencyDashboard.css';

interface EmployeeRanking {
  employeeId: string;
  efficiencyScore: number;
  averageTime: number;
  accuracyRate: number;
  totalTasks: number;
  reworkRate: number;
  totalItems: number;
  averageTimePerItem: number;
  itemsPerHour: number;
}

interface EmployeeTask {
  recordId: string;
  employeeId: string;
  flightNumber: string;
  specId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  accuracyScore: string;
  itemsPacked: number;
  reworkFlag: boolean;
  supervisorNotes: string;
}

const EfficiencyDashboard: React.FC = () => {
  const [ranking, setRanking] = useState<EmployeeRanking[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [recordIdFilter, setRecordIdFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');

  const fetchRanking = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/efficiency/ranking');
      setRanking(response.data);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  };

  const fetchEmployeeTasks = async (employeeId?: string) => {
    try {
      if (employeeId) {
        // Obtener tareas específicas del empleado
        const tasksResponse = await axios.get(`http://localhost:5000/api/efficiency/employee/${employeeId}/tasks`);
        setEmployeeTasks(tasksResponse.data.tasks || []);
      } else {
        setEmployeeTasks([]);
      }
    } catch (error) {
      console.error('Error fetching employee tasks:', error);
      setEmployeeTasks([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchRanking();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeTasks(selectedEmployee);
    }
  }, [selectedEmployee]);

  const getEfficiencyStatus = (score: number) => {
    if (score >= 85) return { text: 'Eficiente', color: 'efficient' };
    if (score >= 70) return { text: 'Regular', color: 'regular' };
    return { text: 'Mejorar', color: 'improve' };
  };

  const getEmployeeName = (employeeId: string) => {
    // Usar directamente el Employee ID del Excel
    return employeeId;
  };

  const calculateItemsPerHour = (employee: EmployeeRanking) => {
    if (employee.averageTime === 0) return 0;
    return Math.round((employee.totalItems / employee.totalTasks) * (3600 / employee.averageTime));
  };

  const filteredRanking = ranking.filter(emp => {
    const matchesEmployee = !employeeFilter || 
      emp.employeeId.toLowerCase().includes(employeeFilter.toLowerCase());
    
    return matchesEmployee;
  });

  const filteredTasks = employeeTasks.filter(task => {
    const matchesRecord = !recordIdFilter || 
      task.recordId.toLowerCase().includes(recordIdFilter.toLowerCase());
    return matchesRecord;
  });

  if (loading) {
    return <div className="loading">Cargando ranking de empleados...</div>;
  }

  return (
    <div className="employee-ranking-dashboard">
      <div className="dashboard-header">
        <h1>👥 Employee Efficiency</h1>
        <div className="filters">
          <input
            type="text"
            placeholder="Filtrar por Record ID..."
            value={recordIdFilter}
            onChange={(e) => setRecordIdFilter(e.target.value)}
            className="filter-input"
          />
          <input
            type="text"
            placeholder="Filtrar por Empleado..."
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      <div className="dashboard-content">
        {/* Ranking List */}
        <div className="ranking-section">
          <h2>🏆 Ranking de Empleados</h2>
          <div className="ranking-list">
            {filteredRanking.map((employee, index) => {
              const status = getEfficiencyStatus(employee.efficiencyScore);
              const itemsPerHour = calculateItemsPerHour(employee);
              
              return (
                <div 
                  key={employee.employeeId} 
                  className={`employee-card ${selectedEmployee === employee.employeeId ? 'selected' : ''}`}
                  onClick={() => setSelectedEmployee(employee.employeeId)}
                >
                  <div className="employee-info">
                    <div className="rank-number">#{index + 1}</div>
                    <div className="employee-icon">👤</div>
                    <div className="employee-details">
                      <h3>{employee.employeeId}</h3>
                      <p>Empleado</p>
                    </div>
                  </div>

                  <div className="performance-metrics">
                    <div className="metric">
                      <div className="metric-label">Productividad</div>
                      <div className="metric-value">{employee.efficiencyScore}%</div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${employee.efficiencyScore}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="metric">
                      <div className="metric-label">Piezas/Hora</div>
                      <div className="metric-value">
                        {itemsPerHour}
                        <span className="trend-icon">📈</span>
                      </div>
                    </div>

                    <div className="metric">
                      <div className="metric-label">Tiempo/Tarea</div>
                      <div className="metric-value">
                        {(employee.averageTime / 60).toFixed(1)} min
                        <span className="clock-icon">⏰</span>
                      </div>
                    </div>

                    <div className="metric">
                      <div className="metric-label">Precisión</div>
                      <div className="metric-value">
                        {(employee.accuracyRate * 100).toFixed(0)}%
                        <span className="target-icon">🎯</span>
                      </div>
                    </div>
                  </div>

                  <div className="efficiency-status">
                    <button className={`status-button ${status.color}`}>
                      {status.text}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Employee Tasks Detail */}
        {selectedEmployee && (
          <div className="tasks-section">
            <h2>📋 Tareas de {selectedEmployee}</h2>
            <div className="tasks-list">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <div key={task.recordId} className="task-card">
                    <div className="task-header">
                      <h4>{task.recordId}</h4>
                      <span className={`task-status ${task.accuracyScore.toLowerCase().replace(' ', '-')}`}>
                        {task.accuracyScore}
                      </span>
                    </div>
                    <div className="task-details">
                      <div className="task-info">
                        <span><strong>Vuelo:</strong> {task.flightNumber}</span>
                        <span><strong>Especificación:</strong> {task.specId}</span>
                        <span><strong>Items:</strong> {task.itemsPacked}</span>
                        <span><strong>Duración:</strong> {task.durationSeconds}s</span>
                      </div>
                      <div className="task-time">
                        <span><strong>Inicio:</strong> {task.startTime}</span>
                        <span><strong>Fin:</strong> {task.endTime}</span>
                      </div>
                      {task.supervisorNotes && (
                        <div className="task-notes">
                          <strong>Notas:</strong> {task.supervisorNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-tasks">
                  <p>No hay tareas específicas disponibles para este empleado.</p>
                  <p>Selecciona un empleado diferente o verifica los filtros.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EfficiencyDashboard;
