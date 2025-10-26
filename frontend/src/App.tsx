import React, { useState } from 'react';
import './App.css';
import BottleDecision from './components/BottleDecision';
// Use the cleaned dashboard implementation to avoid a corrupted source file
import ErrorDashboard from './components/ErrorDashboard/ErrorDashboardClean';
import EfficiencyDashboard from './components/EfficiencyDashboard/EfficiencyDashboard';

function App() {
  const [activeTab, setActiveTab] = useState<'bottles' | 'errors' | 'efficiency'>('bottles');

  return (
    <div className="App">
      <header className="App-header">
        <h1> Catering SmartOps</h1>
      
        
        <div className="nav-tabs">
          <button 
            className={`tab ${activeTab === 'bottles' ? 'active' : ''}`}
            onClick={() => setActiveTab('bottles')}
          >
            Alcohol Bottle Decision
          </button>
          <button 
            className={`tab ${activeTab === 'errors' ? 'active' : ''}`}
            onClick={() => setActiveTab('errors')}
          >
            Real-Time Error Detection
          </button>
          <button 
            className={`tab ${activeTab === 'efficiency' ? 'active' : ''}`}
            onClick={() => setActiveTab('efficiency')}
          >
            Employee Efficiency
          </button>
        </div>
      </header>
      
      <main>
        {activeTab === 'bottles' && <BottleDecision />}
        {activeTab === 'errors' && <ErrorDashboard />}
        {activeTab === 'efficiency' && <EfficiencyDashboard />}
      </main>
    </div>
  );
}

export default App;