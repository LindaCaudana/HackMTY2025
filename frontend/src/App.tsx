import React from 'react';
import './App.css';
import BottleDecision from './components/BottleDecision';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🍷 Smart Execution Hub</h1>
        <p>Alcohol Bottle Decision Engine</p>
      </header>
      <main>
        <BottleDecision />
      </main>
    </div>
  );
}

export default App;