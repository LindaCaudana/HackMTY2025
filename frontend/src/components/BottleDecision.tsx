import React, { useState } from 'react';
import axios from 'axios';
import './BottleDecision.css';

interface Bottle {
  customerCode: string;
  fillLevel: number;
  sealStatus: string;
  cleanliness: string;
  labelStatus: string;
}

interface Decision {
  action: string;
  reason: string;
  timestamp: string;
  color: string;
}

const BottleDecision = () => {
  const [bottle, setBottle] = useState<Bottle>({
    customerCode: 'EK',
    fillLevel: 100,
    sealStatus: 'Sealed',
    cleanliness: 'Excellent',
    labelStatus: 'Intact'
  });
  
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Decision[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:5000/api/bottles/evaluate', bottle);
      const newDecision = response.data;
      setDecision(newDecision);
      setHistory(prev => [newDecision, ...prev.slice(0, 9)]); // Últimas 10
    } catch (error) {
      console.error('Error evaluating bottle:', error);
      alert('Error processing bottle decision. Make sure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Bottle, value: any) => {
    setBottle(prev => ({ ...prev, [field]: value }));
  };

  const quickExamples = [
    {
      name: "Opened Emirates Bottle",
      data: { customerCode: 'EK', fillLevel: 45, sealStatus: 'Opened', cleanliness: 'Good', labelStatus: 'Intact' }
    },
    {
      name: "Damaged BA Bottle", 
      data: { customerCode: 'BA', fillLevel: 75, sealStatus: 'Resealed', cleanliness: 'Excellent', labelStatus: 'Heavily_Damaged' }
    },
    {
      name: "Partial Swiss Bottle",
      data: { customerCode: 'LX', fillLevel: 65, sealStatus: 'Sealed', cleanliness: 'Good', labelStatus: 'Slightly_Damaged' }
    }
  ];

  return (
    <div className="bottle-decision">
      <div className="container">
        <div className="row">
          {/* FORMULARIO */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h3>Evaluate Alcohol Bottle</h3>
              </div>
              <div className="card-body">
                {/* QUICK EXAMPLES */}
                <div className="quick-examples mb-3">
                  <h6>Quick Examples:</h6>
                  <div className="btn-group">
                    {quickExamples.map((example, index) => (
                      <button
                        key={index}
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setBottle(example.data)}
                      >
                        {example.name}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* AIRLINE SELECTOR */}
                  <div className="form-group">
                    <label>Airline:</label>
                    <select 
                      className="form-control"
                      value={bottle.customerCode}
                      onChange={(e) => handleChange('customerCode', e.target.value)}
                    >
                      <option value="EK">Emirates</option>
                      <option value="BA">British Airways</option>
                      <option value="LX">Swiss International Air Lines</option>
                      <option value="QR">Qatar Airways</option>
                    </select>
                  </div>

                  {/* FILL LEVEL */}
                  <div className="form-group">
                    <label>Fill Level: {bottle.fillLevel}%</label>
                    <input 
                      type="range" 
                      className="form-range"
                      min="0" 
                      max="100" 
                      value={bottle.fillLevel}
                      onChange={(e) => handleChange('fillLevel', parseInt(e.target.value))}
                    />
                  </div>

                  {/* SEAL STATUS */}
                  <div className="form-group">
                    <label>Seal Status:</label>
                    <select 
                      className="form-control"
                      value={bottle.sealStatus}
                      onChange={(e) => handleChange('sealStatus', e.target.value)}
                    >
                      <option value="Sealed">Sealed</option>
                      <option value="Resealed">Resealed</option>
                      <option value="Opened">Opened</option>
                    </select>
                  </div>

                  {/* CLEANLINESS */}
                  <div className="form-group">
                    <label>Cleanliness:</label>
                    <select 
                      className="form-control"
                      value={bottle.cleanliness}
                      onChange={(e) => handleChange('cleanliness', e.target.value)}
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>

                  {/* LABEL STATUS */}
                  <div className="form-group">
                    <label>Label Condition:</label>
                    <select 
                      className="form-control"
                      value={bottle.labelStatus}
                      onChange={(e) => handleChange('labelStatus', e.target.value)}
                    >
                      <option value="Intact">Intact</option>
                      <option value="Slightly_Damaged">Slightly Damaged</option>
                      <option value="Heavily_Damaged">Heavily Damaged</option>
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? 'Evaluating...' : 'Evaluate Bottle'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* RESULTADO */}
          <div className="col-md-6">
            {decision && (
              <div className={`decision-result alert alert-${decision.color}`}>
                <h4>Decision: {decision.action}</h4>
                <p>{decision.reason}</p>
                <small>Timestamp: {new Date(decision.timestamp).toLocaleString()}</small>
                
                {/* VISUAL INDICATOR */}
                <div className="decision-visual mt-3">
                  <div className={`indicator ${decision.color}`}>
                    {decision.action}
                  </div>
                </div>
              </div>
            )}
            
            {/* PLACEHOLDER WHEN NO DECISION */}
            {!decision && (
              <div className="card">
                <div className="card-body text-center">
                  <h5>No bottle evaluated yet</h5>
                  <p>Fill the form and click "Evaluate Bottle" to get a decision</p>
                </div>
              </div>
            )}

            {/* HISTORY */}
            {history.length > 0 && (
              <div className="history-section mt-4">
                <h5>Recent Decisions</h5>
                {history.map((item, index) => (
                  <div key={index} className={`alert alert-${item.color} py-2`}>
                    <small><strong>{item.action}</strong> - {item.reason}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottleDecision;