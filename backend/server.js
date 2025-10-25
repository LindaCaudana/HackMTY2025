// backend/server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// RUTA BASE DE PRUEBA
app.get('/', (req, res) => {
  res.json({ message: 'Smart Execution Hub API running!' });
});

// MÓDULO BOTELLAS - RUTAS PRINCIPALES
app.post('/api/bottles/evaluate', (req, res) => {
  const bottleData = req.body;
  const decision = evaluateBottle(bottleData);
  res.json(decision);
});

app.get('/api/bottles/history', (req, res) => {
  res.json({ history: getDecisionHistory() });
});

// MOTOR DE REGLAS SLA
function evaluateBottle(bottle) {
  const rules = getAirlineRules(bottle.customerCode);
  
  for (const rule of rules) {
    if (rule.condition(bottle)) {
      return {
        action: rule.action,
        reason: rule.reason,
        timestamp: new Date().toISOString(),
        color: getActionColor(rule.action)
      };
    }
  }
  
  return {
    action: 'Keep',
    reason: 'No issues detected - meets standards',
    timestamp: new Date().toISOString(),
    color: 'success'
  };
}

// REGLAS BASADAS EN DATASET
function getAirlineRules(customerCode) {
  const rules = {
    'EK': [ // Emirates
      {
        action: 'Discard',
        reason: 'Emirates policy: Discard all opened bottles',
        condition: (bottle) => bottle.sealStatus === 'Opened'
      },
      {
        action: 'Refill',
        reason: 'Fill level below 90% - requires refill',
        condition: (bottle) => bottle.fillLevel < 90 && bottle.cleanliness !== 'Poor'
      },
      {
        action: 'Replace',
        reason: 'Label heavily damaged - replace bottle',
        condition: (bottle) => bottle.labelStatus === 'Heavily_Damaged'
      }
    ],
    'BA': [ // British Airways
      {
        action: 'Discard',
        reason: 'British Airways: Discard all opened bottles',
        condition: (bottle) => bottle.sealStatus === 'Opened'
      },
      {
        action: 'Replace', 
        reason: 'Fill level below 80% - replace bottle',
        condition: (bottle) => bottle.fillLevel < 80
      }
    ],
    'LX': [ // Swiss Air
      {
        action: 'Keep',
        reason: 'Swiss Air: Reuse if above 70% fill and sealed',
        condition: (bottle) => bottle.fillLevel > 70 && bottle.sealStatus === 'Sealed'
      },
      {
        action: 'Refill',
        reason: 'Partial bottle - refill for reuse',
        condition: (bottle) => bottle.fillLevel <= 70 && bottle.fillLevel > 50
      }
    ]
  };
  
  return rules[customerCode] || rules['EK']; // Default Emirates
}

function getActionColor(action) {
  const colors = {
    'Keep': 'success',
    'Refill': 'warning', 
    'Replace': 'danger',
    'Discard': 'dark'
  };
  return colors[action] || 'secondary';
}

// HISTORIAL EN MEMORIA (SIMPLIFICADO)
let decisionHistory = [];

function getDecisionHistory() {
  return decisionHistory.slice(-10); // Últimas 10 decisiones
}

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});