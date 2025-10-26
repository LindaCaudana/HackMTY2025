import React, { useState, useEffect, useCallback } from 'react';
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
  // accuracy may come as string like '95' or '95%' or number like 0.95 or 95
  accuracyScore?: string | number;
  accuracyRate?: number;
  itemsPacked: number;
  // rework may be represented in different ways in the backend
  reworkFlag?: boolean;
  rework?: boolean | string;
  supervisorNotes: string;
}

const EfficiencyDashboard: React.FC = () => {
  const [ranking, setRanking] = useState<EmployeeRanking[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [recordIdFilter, setRecordIdFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');

  const fetchRanking = useCallback(async () => {
    try {
  const response = await axios.get('https://hackmty2025.onrender.com/api/efficiency/ranking');
  // backend may return an array or an object; normalize to array
      const payload = response.data;
      if (Array.isArray(payload)) {
        setRanking(payload);
      } else if (payload && Array.isArray(payload.ranking)) {
        setRanking(payload.ranking);
      } else if (payload && Array.isArray(payload.data)) {
        setRanking(payload.data);
      } else {
        // fallback: try to extract from common wrapper keys
        const extracted = payload && (payload.items || payload.results || payload.list || payload.rows);
        if (Array.isArray(extracted)) setRanking(extracted);
        else setRanking([]);
      }
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  }, []);

  const fetchEmployeeTasks = useCallback(async (employeeId?: string) => {
    try {
      if (employeeId) {
  const tasksResponse = await axios.get(`https://hackmty2025.onrender.com/api/efficiency/employee/${employeeId}/tasks`);
        setEmployeeTasks(tasksResponse.data.tasks || []);
      } else {
        setEmployeeTasks([]);
      }
    } catch (error) {
      console.error('Error fetching employee tasks:', error);
      setEmployeeTasks([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await fetchRanking();
      setLoading(false);
    };
    loadData();
  }, [fetchRanking]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeTasks(selectedEmployee);
    }
  }, [selectedEmployee, fetchEmployeeTasks]);

  const getEfficiencyStatus = (score: number) => {
    if (score >= 85) return { text: 'Efficient', color: 'efficient' };
    if (score >= 70) return { text: 'Average', color: 'regular' };
    return { text: 'Needs Improvement', color: 'improve' };
  };

  // Items/Hour metric removed by UX request. Chart will visualize items per task instead.

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

  // Determine whether to show per-employee summary. Show when an employee is selected
  // or when the user filtered tasks (recordIdFilter) and there are tasks matching.
  const showSummary = Boolean(selectedEmployee) || (filteredTasks.length > 0);

  // Choose source tasks for the summary. Memoize the selection so its identity
  // is stable for useMemo dependencies and to satisfy eslint-hooks warnings.
  const tasksForSummary: EmployeeTask[] = React.useMemo(() => {
    if (selectedEmployee) {
      return filteredTasks.length > 0 ? filteredTasks : employeeTasks;
    }
    return filteredTasks.length > 0 ? filteredTasks : [];
  }, [selectedEmployee, filteredTasks, employeeTasks]);

  // Compute summary metrics
  const summary = React.useMemo(() => {
    if (!tasksForSummary || tasksForSummary.length === 0) return null;
    const total = tasksForSummary.length;
    const totalDuration = tasksForSummary.reduce((s, t) => s + (t.durationSeconds || 0), 0);
    const avgDuration = totalDuration / total; // seconds
    const totalItems = tasksForSummary.reduce((s, t) => s + (t.itemsPacked || 0), 0);
    const avgItems = totalItems / total;
    // Count only explicit reworkFlag values (true) as requested
    const reworkCount = tasksForSummary.reduce((s, t) => s + (t.reworkFlag ? 1 : 0), 0);
    const hasRework = reworkCount > 0;

    // Try to parse accuracy numeric values from multiple possible fields
    const accuracyValues: number[] = [];
    tasksForSummary.forEach(t => {
      // prefer accuracyRate numeric if present
      if (typeof t.accuracyRate === 'number' && !Number.isNaN(t.accuracyRate)) {
        // if 0-1 scale convert to percent
        const val = t.accuracyRate > 1 ? t.accuracyRate : t.accuracyRate * 100;
        accuracyValues.push(val);
        return;
      }
      const raw = t.accuracyScore != null ? String(t.accuracyScore).trim() : '';
      if (!raw) return;
      const asPercent = raw.endsWith('%');
      const numeric = parseFloat(raw.replace('%', ''));
      if (!Number.isNaN(numeric)) {
        accuracyValues.push(asPercent ? numeric : (numeric > 1 ? numeric : numeric * 100));
      }
    });
    const avgAccuracy = accuracyValues.length > 0 ? (accuracyValues.reduce((s, a) => s + a, 0) / accuracyValues.length) : NaN;

    return {
      total,
      avgDuration,
      totalItems,
      avgItems,
      reworkRate: (reworkCount / total) * 100,
      hasRework,
      avgAccuracy
    };
  }, [tasksForSummary]);

  // Prepare data for a simple tasks bar chart (itemsPacked per task)
  const chartData = React.useMemo(() => {
    return tasksForSummary.map((t, i) => ({
      label: t.recordId || `#${i + 1}`,
      value: t.itemsPacked || 0,
      duration: t.durationSeconds || 0,
    }));
  }, [tasksForSummary]);

  const chartSvgHeight = 140;
  const chartSvgWidth = Math.max(300, chartData.length * 50);
  const maxItems = chartData.length > 0 ? Math.max(...chartData.map(c => c.value)) : 1;

  if (loading) {
    return <div className="loading">Loading employee ranking...</div>;
  }

  return (
    <div className="employee-ranking-dashboard">
      <div className="dashboard-header">
        <h1>Employee Efficiency</h1>
        <div className="filters">
          <input
            type="text"
            placeholder="Filter by Record ID..."
            value={recordIdFilter}
            onChange={(e) => setRecordIdFilter(e.target.value)}
            className="filter-input"
          />
          <input
            type="text"
            placeholder="Filter by Employee..."
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      <div className="dashboard-content">
        {/* Ranking List */}
        <div className="ranking-section">
          <h2>Employee Ranking</h2>
          <div className="ranking-list">
            {filteredRanking.map((employee, index) => {
              const status = getEfficiencyStatus(employee.efficiencyScore);
              
              return (
                <div 
                  key={employee.employeeId} 
                  className={`employee-card ${selectedEmployee === employee.employeeId ? 'selected' : ''}`}
                  onClick={() => setSelectedEmployee(employee.employeeId)}
                >
                  <div className="employee-info">
                    <div className="rank-number">#{index + 1}</div>
                    <div className="employee-icon" />
                    <div className="employee-details">
                      <h3>{employee.employeeId}</h3>
                      <p>Employee</p>
                    </div>
                  </div>

                  <div className="performance-metrics">
                    <div className="metric">
                      <div className="metric-label">Productivity</div>
                      <div className="metric-value">{employee.efficiencyScore}%</div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${employee.efficiencyScore}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Items/Hour metric removed */}

                    <div className="metric">
                      <div className="metric-label">Time/Task</div>
                      <div className="metric-value">
                        {(employee.averageTime / 60).toFixed(1)} min
                        <span className="clock-icon" />
                      </div>
                    </div>

                    <div className="metric">
                      <div className="metric-label">Accuracy</div>
                      <div className="metric-value">
                        {(employee.accuracyRate * 100).toFixed(0)}%
                        <span className="target-icon" />
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

        {/* Employee Tasks Detail (shows when an employee is selected or when tasks are filtered) */}
        {showSummary && (
          <div className="tasks-section">
            <h2>{selectedEmployee ? `Tasks for ${selectedEmployee}` : 'Filtered Tasks'}</h2>
            {/* Per-employee summary card */}
            {showSummary && summary && (
              <div className="employee-summary-card">
                <div className="summary-grid">
                  <div className="summary-item">
                    <div className="label">Total tasks</div>
                    <div className="value">{summary.total}</div>
                  </div>
                  <div className="summary-item">
                    <div className="label">Average duration</div>
                    <div className="value">{summary.avgDuration.toFixed(1)} s</div>
                  </div>
                  <div className="summary-item">
                    <div className="label">Average items</div>
                    <div className="value">{summary.avgItems.toFixed(1)}</div>
                  </div>
                        <div className="summary-item">
                          <div className="label">Rework</div>
                          <div className="value">{summary.hasRework ? 'Yes' : 'No'}</div>
                        </div>
                        <div className="summary-item">
                          <div className="label">Accuracy</div>
                          <div className="value">
                            {(() => {
                              if (selectedEmployee) {
                                const emp = ranking.find(r => r.employeeId === selectedEmployee);
                                if (emp && typeof emp.accuracyRate === 'number' && !Number.isNaN(emp.accuracyRate)) {
                                  return `${(emp.accuracyRate * 100).toFixed(0)}%`;
                                }
                              }
                              return Number.isNaN(summary.avgAccuracy) ? 'n/a' : `${summary.avgAccuracy.toFixed(0)}%`;
                            })()
                            }
                          </div>
                        </div>
                </div>
              </div>
            )}
            {/* Simple items-per-task bar chart */}
            {chartData.length > 0 && (
              <div className="tasks-chart">
                  <h3>Items per Task</h3>
                  <svg width="100%" viewBox={`0 0 ${chartSvgWidth} ${chartSvgHeight}`} preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="gradItems" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#764ba2" />
                        <stop offset="100%" stopColor="#667eea" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const left = 40;
                      const top = 20;
                      const bottom = 30;
                      const barW = 30;
                      const gap = 10;
                      const maxH = chartSvgHeight - top - bottom;
                      const tickCount = 4;
                      return (
                        <g>
                          {/* Y axis grid + labels */}
                          {Array.from({ length: tickCount }).map((_, ti) => {
                            const val = Math.round((maxItems * (tickCount - 1 - ti)) / (tickCount - 1));
                            const y = top + Math.round(((maxItems - val) / maxItems) * maxH);
                            return (
                              <g key={`tick-${ti}`}>
                                <line x1={left} x2={chartSvgWidth - 10} y1={y} y2={y} stroke="#444" strokeDasharray="3,3" />
                                <text x={left - 8} y={y + 4} fontSize={11} fill="#bfc6ff" textAnchor="end">{val}</text>
                              </g>
                            );
                          })}

                          {/* Bars */}
                          {chartData.map((c, i) => {
                            const x = left + i * (barW + gap);
                            const h = maxItems > 0 ? Math.round((c.value / maxItems) * maxH) : 0;
                            const y = top + (maxH - h);
                            return (
                              <g key={`bar-${i}`}>
                                <rect x={x} y={y} width={barW} height={h} fill="url(#gradItems)" rx={6} />
                                <title>{`${c.label}: ${c.value} items`}</title>
                                {/* value label: inside bar if tall enough, otherwise above */}
                                {h > 22 ? (
                                  <text x={x + barW / 2} y={y + 16} fontSize={11} fill="#fff" textAnchor="middle">{c.value}</text>
                                ) : (
                                  <text x={x + barW / 2} y={y - 6} fontSize={11} fill="#bfc6ff" textAnchor="middle">{c.value}</text>
                                )}
                                <text x={x + barW / 2} y={chartSvgHeight - 8} fontSize={10} fill="#bfc6ff" textAnchor="middle">{c.label}</text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
            )}

            <div className="tasks-list">
              {tasksForSummary.length > 0 ? (
                tasksForSummary.map((task) => (
                  <div key={task.recordId} className="task-card">
                      <div className="task-header">
                        <h4>{task.recordId}</h4>
                        {(() => {
                          const raw = task.accuracyScore != null ? String(task.accuracyScore) : (task.accuracyRate != null ? String(task.accuracyRate) : '');
                          const cls = raw ? raw.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'unknown';
                          return <span className={`task-status ${cls}`}>{raw || 'n/a'}</span>;
                        })()}
                      </div>
                    <div className="task-details">
                      <div className="task-info">
                        <span><strong>Flight:</strong> {task.flightNumber}</span>
                        <span><strong>Spec:</strong> {task.specId}</span>
                        <span><strong>Items:</strong> {task.itemsPacked}</span>
                        <span><strong>Duration:</strong> {task.durationSeconds}s</span>
                      </div>
                      <div className="task-time">
                        <span><strong>Start:</strong> {task.startTime}</span>
                        <span><strong>End:</strong> {task.endTime}</span>
                      </div>
                      {task.supervisorNotes && (
                        <div className="task-notes">
                          <strong>Notes:</strong> {task.supervisorNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-tasks">
                  <p>No specific tasks available for this employee.</p>
                  <p>Select a different employee or check the filters.</p>
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
