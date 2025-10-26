import React, { useState } from 'react';
import axios from 'axios';
import './BottleDecision.css';
import { useEffect } from 'react';

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
  
  const [fieldsMeta, setFieldsMeta] = useState<any[]>([]);
  const [dynamicInputs, setDynamicInputs] = useState<Record<string, any>>({});
  const [mappings, setMappings] = useState<any>(null);
  const [keysMap, setKeysMap] = useState<any>({});
  const [saveInputs, setSaveInputs] = useState<boolean>(false);
  

  useEffect(() => {
    // fetch fields metadata and mappings for dynamic form
    Promise.all([
      axios.get('http://localhost:5000/api/alcohol/fields'),
      axios.get('http://localhost:5000/api/alcohol/mappings')
    ]).then(([fieldsRes, mapRes]) => {
      const fdata = (fieldsRes.data && fieldsRes.data.fields) ? fieldsRes.data.fields : [];
      const mapdata = (mapRes.data && mapRes.data.mappings) ? mapRes.data.mappings : null;

      // dedupe fields by normalized name (strip non-alphanum) and filter out undesirable ones
      const seen = new Set<string>();
      const cleaned: any[] = [];
      for (const f of fdata) {
        const name = String(f.name || '').trim();
        const key = name.toLowerCase();
        const normKey = key.replace(/[^a-z0-9]/g, '');
        if (seen.has(normKey)) continue;
        seen.add(normKey);
        // hide id, action, decision, recommended, sla
        if (key.includes('id') && !key.includes('customer')) continue;
        if (key.includes('record id') || key.includes('bottle id')) continue;
        if (key.includes('action') || key.includes('decision') || key.includes('result') || key.includes('recommend') || key.includes('suggest')) continue;
        if (key.includes('sla')) continue;
        // hide dynamic fields that duplicate our static controls or are flight/inbound (we don't want them in dynamicInputs)
        const normalizedForCheck = key.replace(/[^a-z0-9_]/g, '_');
        if (/\b(fill|filllevel|fill_level|seal|seal_status|clean|cleanliness|cleanliness_score|label|label_status)\b/.test(normalizedForCheck)) continue;
        if (key.includes('flight') || key.includes('inbound')) continue;
        cleaned.push(f);
      }

      setFieldsMeta(cleaned);

      const initial: Record<string, any> = {};
      cleaned.forEach((f: any) => {
        initial[f.name] = f.sampleValues && f.sampleValues.length ? f.sampleValues[0] : (f.type === 'number' ? 0 : '');
      });
      setDynamicInputs(initial);

      if (mapdata) {
        setMappings(mapdata);
        setKeysMap({ customerNameKey: mapdata.customerNameKey, customerCodeKey: mapdata.customerCodeKey, productKey: mapdata.productKey, brandKey: mapdata.brandKey });
      }
    }).catch(err => {
      console.warn('Could not fetch fields metadata or mappings', err.message || err);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // assemble payload but do not send immediately; show preview so user can confirm
    const submitBottle = { ...bottle } as any;
      const mapHeaderToBottleField = (h: string) => {
        const hl = h.toLowerCase();
        if (hl.includes('fill')) return 'fillLevel';
        if (hl.includes('seal')) return 'sealStatus';
        if (hl.includes('label')) return 'labelStatus';
        if (hl.includes('clean')) return 'cleanliness';
        if (hl.includes('customer') || hl.includes('airline')) return 'customerCode';
        return h;
      };
      const staticFields = new Set(['fillLevel', 'sealStatus', 'cleanliness', 'labelStatus', 'customerCode']);
      Object.keys(dynamicInputs).forEach(h => {
        const mapped = mapHeaderToBottleField(h);
        const val = dynamicInputs[h];
        // do not overwrite existing bottle values with empty strings/null/undefined
        if (val === '' || val === null || val === undefined) return;

        // never let dynamic excel 'customer' column overwrite the derived customerCode from selection
        if (mapped === 'customerCode') return;

        // for fillLevel, coerce to number and only overwrite if valid
        if (mapped === 'fillLevel') {
          const num = Number(String(val).replace('%', '').trim());
          if (!isNaN(num)) submitBottle[mapped] = num;
          return;
        }

        // for other static fields, prefer bottle value unless dynamic provides an explicit, different value
        if (staticFields.has(mapped)) {
          // if dynamic value equals current bottle value (string/number), skip; otherwise accept
          const curr = submitBottle[mapped];
          if (String(curr) === String(val)) return;
          submitBottle[mapped] = val;
          return;
        }

        // default: accept dynamic value
        submitBottle[mapped] = val;
      });

    // construct inbound flight from customerCode + flightNumber if possible
    const flightNum = dynamicInputs['flightNumber'];
    if (bottle.customerCode) submitBottle['customerCode'] = bottle.customerCode;
    if (flightNum) {
      submitBottle['inboundFlight'] = `${bottle.customerCode || ''}${flightNum}`;
    }

    // directly evaluate with constructed payload
    await doEvaluate(submitBottle);
  };

  const doEvaluate = async (payload: any) => {
    setLoading(true);
    try {
      const response = await axios.post('https://hackmty2025.onrender.com/api/bottles/evaluate', payload);
      const newDecision = response.data;
      setDecision(newDecision);
      setHistory(prev => [newDecision, ...prev.slice(0, 9)]);
      // optionally save the inputs to DB for later inspection
      if (saveInputs) {
        try {
          await axios.post('http://localhost:5000/api/alcohol/save-input', payload);
        } catch (err) {
          console.warn('Could not save inputs:', err);
        }
      }
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

  // quickExamples removed per request; fillLevel will be controlled in 10% steps and shown on a bottle silhouette

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
                {/* quick examples removed */}

                <form onSubmit={handleSubmit}>
                  {fieldsMeta.length > 0 && (
                    <div className="dynamic-fields mb-3">
                      <h6>Detected inputs</h6>
                      {fieldsMeta.map((f: any) => {
                        const key = f.name;
                        const keyL = key.toLowerCase();

                        // avoid rendering any dynamic "flight"/"inbound" field from the Excel
                        if (keyL.includes('flight') || keyL.includes('inbound')) return null;
                        // hide dynamic fields that duplicate our static controls: fill level, seal status, cleanliness, label
                        if (/\b(fill|filllevel|fill_level|seal|seal_status|clean|cleanliness|cleanliness_score|label|label_status)\b/.test(keyL.replace(/[^a-z0-9_]/g, '_'))) return null;

                        // skip if this is the detected customerCodeKey or brandKey (we'll handle via mappings)
                        if (keysMap.customerCodeKey && key === keysMap.customerCodeKey) return null;
                        if (keysMap.brandKey && key === keysMap.brandKey) return null;

                        // Fields that must be combo boxes
                        const comboMatchers = ['service', 'class', 'category', 'cleanliness_score', 'cleanliness', 'label', 'size', 'bottle size', 'condition', 'origin', 'destination', 'destinations'];
                        const isCombo = comboMatchers.some(m => keyL.includes(m));

                        const isFill = keyL.includes('fill');
                        const isProductName = keysMap.productKey && key === keysMap.productKey;
                        const isCustomerName = keysMap.customerNameKey && key === keysMap.customerNameKey;

                        // render fill slider
                        if (isFill) {
                          return (
                            <div className="form-group" key={key}>
                              <label>{key}: {dynamicInputs[key]}%</label>
                              <input type="range" min={0} max={100} step={10} className="form-range" value={dynamicInputs[key] || 0} onChange={(e) => setDynamicInputs(prev => ({ ...prev, [key]: parseInt(e.target.value) }))} />
                            </div>
                          );
                        }

                        // customer name select -> set customerCode automatically
                        if (isCustomerName) {
                          const options = f.sampleValues || [];
                          return (
                            <div className="form-group" key={key}>
                              <label>{key}:</label>
                              <select className="form-control" value={dynamicInputs[key] || ''} onChange={(e) => {
                                const val = e.target.value;
                                setDynamicInputs(prev => ({ ...prev, [key]: val }));
                                // set customer code if mapping available
                                if (mappings && mappings.customerNameToCode && mappings.customerNameToCode[val]) {
                                  setBottle(prev => ({ ...prev, customerCode: mappings.customerNameToCode[val] }));
                                }
                              }}>
                                <option value="">(select)</option>
                                {options.map((v: any, i: number) => <option key={i} value={v}>{v}</option>)}
                              </select>
                            </div>
                          );
                        }

                        // product name is text input; brand auto-filled
                        if (isProductName) {
                          return (
                            <div className="form-group" key={key}>
                              <label>{key}:</label>
                              <input className="form-control" value={dynamicInputs[key] || ''} onChange={(e) => {
                                const val = e.target.value;
                                setDynamicInputs(prev => ({ ...prev, [key]: val }));
                                // auto-fill brand if mapping exists
                                if (mappings && mappings.productToBrand && mappings.productToBrand[val]) {
                                  const b = mappings.productToBrand[val];
                                  if (keysMap.brandKey) setDynamicInputs(prev => ({ ...prev, [keysMap.brandKey]: b }));
                                }
                              }} />
                            </div>
                          );
                        }

                        if (isCombo) {
                          return (
                            <div className="form-group" key={key}>
                              <label>{key}:</label>
                              <select className="form-control" value={dynamicInputs[key] || ''} onChange={(e) => setDynamicInputs(prev => ({ ...prev, [key]: e.target.value }))}>
                                <option value="">(select)</option>
                                {(f.sampleValues && f.sampleValues.length ? f.sampleValues : []).map((v: any, i: number) => <option key={i} value={v}>{v}</option>)}
                              </select>
                            </div>
                          );
                        }

                        // fallback: small sampleValues -> select
                        if (f.sampleValues && f.sampleValues.length > 0 && f.sampleValues.length <= 8) {
                          return (
                            <div className="form-group" key={key}>
                              <label>{key}:</label>
                              <select className="form-control" value={dynamicInputs[key] || ''} onChange={(e) => setDynamicInputs(prev => ({ ...prev, [key]: e.target.value }))}>
                                <option value="">(select)</option>
                                {f.sampleValues.map((v: any, i: number) => <option key={i} value={v}>{v}</option>)}
                              </select>
                            </div>
                          );
                        }

                        // default text input
                        return (
                          <div className="form-group" key={key}>
                            <label>{key}:</label>
                            <input className="form-control" value={dynamicInputs[key] || ''} onChange={(e) => setDynamicInputs(prev => ({ ...prev, [key]: e.target.value }))} />
                          </div>
                        );
                      })}

                      {/* Inbound flight: flight number input; customerCode derived from customer name */}
                      <div className="form-group">
                        <label>Inbound Flight (CustomerCode + Flight number):</label>
                        <div className="d-flex gap-2">
                          <input className="form-control" placeholder="Flight number" value={dynamicInputs['flightNumber'] || ''} onChange={(e) => setDynamicInputs(prev => ({ ...prev, flightNumber: e.target.value }))} />
                          <input className="form-control" placeholder="Inbound flight (computed)" value={(bottle.customerCode || '') + (dynamicInputs['flightNumber'] || '')} readOnly />
                        </div>
                      </div>

                      <div className="form-group form-check">
                        <input id="saveInputs" className="form-check-input" type="checkbox" checked={saveInputs} onChange={(e) => setSaveInputs(e.target.checked)} />
                        <label htmlFor="saveInputs" className="form-check-label">Save inputs after evaluate</label>
                      </div>

                    </div>
                  )}
                  {/* Customer code (derived from customer name). Shown as read-only to avoid manual edits. */}
                  <div className="form-group">
                    <label>Customer code:</label>
                    <input className="form-control" value={bottle.customerCode} readOnly />
                  </div>

                  {/* FILL LEVEL */}
                  <div className="form-group">
                    <label>Fill Level: {bottle.fillLevel}%</label>
                    <input 
                      type="range" 
                      className="form-range"
                      min="0" 
                      max="100" 
                      step={10}
                      value={bottle.fillLevel}
                      onChange={(e) => handleChange('fillLevel', parseInt(e.target.value))}
                    />
                    <div className="fill-help">Choose fill level in 10% increments — the bottle silhouette on the right reflects the selected level.</div>
                    <div className="fill-presets mt-2">
                      {[0,10,20,30,40,50,60,70,80,90,100].map(v => (
                        <button
                          key={v}
                          type="button"
                          className={`btn btn-sm btn-outline-secondary preset ${bottle.fillLevel===v? 'active':''}`}
                          onClick={() => handleChange('fillLevel', v)}
                        >{v}%</button>
                      ))}
                    </div>
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
            {/* Bottle silhouette preview always visible */}
            <div className="card mb-3">
              <div className="card-body text-center">
                <div className="bottle-preview" aria-hidden>
                  <div className="liquid" style={{ height: `${bottle.fillLevel}%` }} />
                  <div className="bottle-label">{bottle.customerCode}</div>
                </div>
                <div className="small text-muted mt-2">Liquid level indicator (10% increments)</div>
                
              </div>
            </div>
            
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