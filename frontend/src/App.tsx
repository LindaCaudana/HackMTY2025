import React, { useState } from 'react';
import './App.css';
import BottleDecision from './components/BottleDecision';
import ErrorDashboard from './components/ErrorDashboard/ErrorDashboard';

function App() {
  const [activeTab, setActiveTab] = useState<'bottles' | 'errors'>('bottles');

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Smart Execution Hub</h1>
        <p>Gate Group - HackMTY 2025</p>
        
        {/* ✅ NUEVO: Navigation Tabs - AGREGAR ESTO */}
        <div className="nav-tabs">
          <button 
            className={`tab ${activeTab === 'bottles' ? 'active' : ''}`}
            onClick={() => setActiveTab('bottles')}
          >
            🍷 Alcohol Bottle Decision
          </button>
          <button 
            className={`tab ${activeTab === 'errors' ? 'active' : ''}`}
            onClick={() => setActiveTab('errors')}
          >
            🔍 Real-Time Error Detection
          </button>
        </div>
      </header>
      
      <main>
        {/* ✅ MODIFICAR ESTO: Agregar condicional */}
        {activeTab === 'bottles' && <BottleDecision />}
        {activeTab === 'errors' && <ErrorDashboard />}
      </main>
    </div>
  );
}

export default App;