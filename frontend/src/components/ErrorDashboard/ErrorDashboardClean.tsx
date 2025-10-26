import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ErrorDashboard.css';

const dropdownLabelsBase = [
  'Stream_ID','Timestamp','Station_ID','Drawer_ID','Spec_ID','Deviation_Score','Operator_ID','Flight_Number','Customer_Name'
];

const ErrorDashboardClean: React.FC = () => {
  const [dbRows, setDbRows] = useState<any[]>([]);
  const [currentDbRow, setCurrentDbRow] = useState<any | null>(null);

  const [userBarcode, setUserBarcode] = useState('');
  const [userTemplate, setUserTemplate] = useState('');
  const [userRfid, setUserRfid] = useState('');
  const [userWeight, setUserWeight] = useState('');

  const [dropdowns, setDropdowns] = useState<string[]>([]);
  const [randomIndex, setRandomIndex] = useState(1);
  const [timestamp, setTimestamp] = useState('');
  const [alerts, setAlerts] = useState<string[]>([]);
  const [showDropdowns, setShowDropdowns] = useState(false);
  const [hasCompared, setHasCompared] = useState(false); 

  // Labels con Alert_Flag al final
  const dropdownLabels = [...dropdownLabelsBase, 'Alert_Flag'];

  const fetchDb = async () => {
    try {
      const r = await axios.get('http://localhost:5000/api/realtime-error/list?limit=200');
      if (r.data && r.data.rows) setDbRows(r.data.rows);
    } catch (err) {
      console.error('Failed to load realtime-error rows', err);
    }
  };

  useEffect(() => { fetchDb(); }, []);

  useEffect(() => {
    if (!dbRows || dbRows.length === 0) return;
    const layoutName = `Layout_${randomIndex}`;
    const found = dbRows.find(r => r.data && r.data.Layout === layoutName) || dbRows[0];
    setCurrentDbRow(found || null);

    // Reset input fields y control de Compare
    setUserBarcode(''); setUserTemplate(''); setUserRfid(''); setUserWeight('');
    setShowDropdowns(false); setAlerts([]); 
    setDropdowns(Array(dropdownLabels.length).fill(''));
    setHasCompared(false);
  }, [dbRows, randomIndex]);

  const parseNumber = (s: any) => {
    if (s == null) return NaN;
    const m = String(s).match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? parseFloat(m[1]) : NaN;
  };

  const handleCompare = () => {
    const allFilled = userBarcode.trim() && userTemplate.trim() && userRfid.trim() && userWeight.trim();
    if (!allFilled) return;

    const now = new Date().toLocaleString();
    setTimestamp(now);

    const issues: string[] = [];
    if (!currentDbRow) {
      issues.push('No reference row available from DB.');
    } else {
      const ref = currentDbRow.data || {};
      if ((ref.Barcode || '') !== userBarcode) issues.push(`Barcode mismatch (expected: ${ref.Barcode || 'n/a'})`);
      if ((ref.RFID || '') !== userRfid) issues.push(`RFID mismatch (expected: ${ref.RFID || 'n/a'})`);
      if ((ref.Layout || '') !== userTemplate) issues.push(`Layout mismatch (expected: ${ref.Layout || 'n/a'})`);
      const refW = parseNumber(ref.Weight || '');
      const uW = parseNumber(userWeight || '');
      if (!isNaN(refW) && !isNaN(uW)) {
        if (Math.abs(refW - uW) > 0.5) issues.push(`Weight deviation too large (expected: ${ref.Weight || 'n/a'})`);
      } else {
        if (isNaN(refW)) issues.push('Reference weight missing/invalid');
        if (isNaN(uW)) issues.push('Entered weight missing/invalid');
      }
    }

    setAlerts(issues);

    if (currentDbRow) {
      const newDropdowns = dropdownLabelsBase.map(l => currentDbRow.data?.[l] || '');
      // Alert_Flag al final
      newDropdowns.push(issues.length > 0 ? issues.join('; ') : 'OK');
      setDropdowns(newDropdowns);
    }

    setShowDropdowns(true);
    setHasCompared(true);
  };

  const expected = currentDbRow ? currentDbRow.data || {} : {};

  return (
    <div className="error-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Real-Time Error Dashboard</h1>
          <div className="dashboard-controls">
            <span>Reference vs Operator input</span>
          </div>
        </div>

        <div className="grid-system">
          <div className="left-panel">
            <div className="image-box">
              <img src={`/layouts/Layout_${randomIndex}.png`} alt={`Layout ${randomIndex}`} />
            </div>
            <ul className="hello-list">
              <li><strong>Barcode:</strong> {expected.Barcode || '—'}</li>
              <li><strong>Layout:</strong> {expected.Layout || `Layout_${randomIndex}`}</li>
              <li><strong>RFID:</strong> {expected.RFID || '—'}</li>
              <li><strong>Weight:</strong> {expected.Weight || '—'}</li>
            </ul>
          </div>

          <div className="right-panel">
            <div className="input-grid">
              <div className="input-item">
                <label>Barcode</label>
                <input value={userBarcode} onChange={e => setUserBarcode(e.target.value)} />
              </div>
              <div className="input-item">
                <label>Layout</label>
                <input value={userTemplate} onChange={e => setUserTemplate(e.target.value)} />
              </div>
              <div className="input-item">
                <label>RFID</label>
                <input value={userRfid} onChange={e => setUserRfid(e.target.value)} />
              </div>
              <div className="input-item">
                <label>Weight</label>
                <input value={userWeight} onChange={e => setUserWeight(e.target.value)} placeholder="e.g. 2.93 kg" />
              </div>
            </div>

            <div className="dashboard-controls" style={{ marginTop: '12px' }}>
              <button
                className="btn-equal"
                onClick={handleCompare}
                disabled={!userBarcode || !userTemplate || !userRfid || !userWeight}
              >
                Compare
              </button>
              <button
                className="btn-equal"
                onClick={() => setRandomIndex(n => (n >= 6 ? 1 : n + 1))}
                disabled={!hasCompared}
              >
                Next layout
              </button>
            </div>

            {alerts.length > 0 && (
              <div className="alerts-section">
                <h3>Detected issues</h3>
                <ul className="alerts-container">
                  {alerts.map((a, i) => <li className="alert-item" key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        {showDropdowns && (
          <div className="dropdown-row">
            <h3>DB columns preview</h3>
            <div className="dropdowns-grid">
              {dropdownLabels.map((label, idx) => {
                const isTimestamp = label.toLowerCase() === 'timestamp';
                const isAlertFlag = label === 'Alert_Flag';
                return (
                  <div className="dropdown-item" key={idx}>
                    <label>{label}</label>
                    {isTimestamp ? (
                      <input readOnly value={timestamp || new Date().toLocaleString()} />
                    ) : (
                      <input
                        value={dropdowns[idx] || ''}
                        style={isAlertFlag ? {
                          color: dropdowns[idx] === 'OK' ? 'green' : 'red',
                          fontWeight: '600'
                        } : {}}
                        readOnly={isAlertFlag} // Alert_Flag siempre readonly
                        onChange={e => {
                          if (!isAlertFlag) {
                            const next = [...dropdowns];
                            next[idx] = e.target.value;
                            setDropdowns(next);
                          }
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorDashboardClean;
