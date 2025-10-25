// backend/server.js
const express = require('express');
const cors = require('cors');
const efficiencyRoutes = require('./routes/efficiency');
const alcoholRuleService = require('./services/AlcoholRuleService');
const alcoholRoutes = require('./routes/alcohol');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Importar rutas
const errorDetectionRoutes = require('./routes/errorDetection');

// RUTA BASE DE PRUEBA
app.get('/', (req, res) => {
  res.json({ message: 'Smart Execution Hub API running!' });
});

// MÓDULO BOTELLAS - RUTAS PRINCIPALES
app.post('/api/bottles/evaluate', (req, res) => {
  const bottleData = req.body;
  console.log('[/api/bottles/evaluate] Received payload:', JSON.stringify(bottleData));
  const decision = evaluateBottle(bottleData);
  // include a lightweight debug object in the response so the frontend can show what was evaluated
  const resp = { ...decision, debug: { received: bottleData } };
  res.json(resp);
});

app.get('/api/bottles/history', (req, res) => {
  res.json({ history: getDecisionHistory() });
});

// MÓDULO ERROR DETECTION
app.use('/api/error-detection', errorDetectionRoutes);

// MÓDULO Efficiency Service
app.use('/api/efficiency', efficiencyRoutes);

// MÓDULO Alcohol import
app.use('/api/alcohol', alcoholRoutes);

// MOTOR DE REGLAS SLA
function evaluateBottle(bottle) {
  // First try dynamic rules loaded from Excel (if any)
  try {
    const dyn = alcoholRuleService.evaluateBottle(bottle);
    if (dyn) {
      const decision = {
        action: dyn.action,
        reason: dyn.reason,
        timestamp: new Date().toISOString(),
        color: getActionColor(dyn.action)
      };
      addToDecisionHistory(decision);
      return decision;
    }
  } catch (err) {
    console.error('Dynamic rule evaluation error:', err);
  }

  const rules = getAirlineRules(bottle.customerCode);
  
  for (const rule of rules) {
    if (rule.condition(bottle)) {
      // Agregar al historial
      const decision = {
        action: rule.action,
        reason: rule.reason,
        timestamp: new Date().toISOString(),
        color: getActionColor(rule.action)
      };
      addToDecisionHistory(decision);
      return decision;
    }
  }
  
  const defaultDecision = {
    action: 'Keep',
    reason: 'No issues detected - meets standards',
    timestamp: new Date().toISOString(),
    color: 'success'
  };
  addToDecisionHistory(defaultDecision);
  return defaultDecision;
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

function addToDecisionHistory(decision) {
  decisionHistory.push(decision);
  // Mantener solo las últimas 10 decisiones
  if (decisionHistory.length > 10) {
    decisionHistory = decisionHistory.slice(-10);
  }
}

function getDecisionHistory() {
  return decisionHistory;
}

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 Bottle Decision API: http://localhost:${PORT}/api/bottles/evaluate`);
  console.log(`🔍 Error Detection API: http://localhost:${PORT}/api/error-detection/metrics`);
  console.log(`👥 Employee Efficiency API: http://localhost:${PORT}/api/efficiency/metrics`);
});