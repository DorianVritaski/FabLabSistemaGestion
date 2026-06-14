import React, { useState, useEffect } from 'react';
import api from '../api';

const Machines = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [machineData, setMachineData] = useState({ name: '', type: 'Impresora 3D', maintenance_limit_hours: 100 });
  
  const [showActionForm, setShowActionForm] = useState(null); // 'usage', 'incident', 'maintenance', 'report'
  const [selectedMachine, setSelectedMachine] = useState(null);
  
  const [actionData, setActionData] = useState({});
  const [reportData, setReportData] = useState(null);

  const fetchMachines = async () => {
    try {
      const res = await api.get('/machines');
      setMachines(res.data);
    } catch (error) {
      console.error("Error fetching machines", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleCreateMachine = async (e) => {
    e.preventDefault();
    try {
      await api.post('/machines', machineData);
      setShowMachineForm(false);
      setMachineData({ name: '', type: 'Impresora 3D', maintenance_limit_hours: 100 });
      fetchMachines();
    } catch (error) {
      alert("Error al crear máquina");
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (showActionForm === 'usage') {
        await api.post(`/machines/${selectedMachine.id}/usages`, { hours_used: parseFloat(actionData.hours_used), description: actionData.description });
      } else if (showActionForm === 'incident') {
        await api.post(`/machines/${selectedMachine.id}/incidents`, { description: actionData.description });
      } else if (showActionForm === 'maintenance') {
        await api.post(`/machines/${selectedMachine.id}/maintenances`, { type: actionData.type, description: actionData.description, cost: actionData.cost ? parseFloat(actionData.cost) : null });
      }
      
      setShowActionForm(null);
      setActionData({});
      fetchMachines();
    } catch (error) {
      alert(`Error al registrar ${showActionForm}`);
    }
  };

  const fetchReport = async (machine) => {
    try {
      const res = await api.get(`/machines/${machine.id}/report`);
      setReportData(res.data);
      setShowActionForm('report');
      setSelectedMachine(machine);
    } catch (error) {
      alert("Error al obtener el reporte");
    }
  };

  const openActionForm = (machine, actionType) => {
    setSelectedMachine(machine);
    setShowActionForm(actionType);
    if (actionType === 'maintenance') {
      setActionData({ type: 'preventive', description: '', cost: '' });
    } else {
      setActionData({});
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ color: 'var(--color-primary)' }}>Gestión de Máquinas</h1>
        <button className="btn btn-primary" onClick={() => setShowMachineForm(true)}>+ Nueva Máquina</button>
      </div>

      {showMachineForm && (
        <div className="card mb-4">
          <h3>Registrar Nueva Máquina</h3>
          <form onSubmit={handleCreateMachine} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="input-label">Nombre</label>
              <input type="text" className="input-field" value={machineData.name} onChange={e => setMachineData({...machineData, name: e.target.value})} required />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="input-label">Tipo</label>
              <select className="input-field" value={machineData.type} onChange={e => setMachineData({...machineData, type: e.target.value})}>
                <option value="Impresora 3D">Impresora 3D</option>
                <option value="Corte/Grabado Laser">Corte/Grabado Laser</option>
                <option value="Fresadora">Fresadora</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: '150px' }}>
              <label className="input-label">Límite Mantenimiento (Horas)</label>
              <input type="number" className="input-field" value={machineData.maintenance_limit_hours} onChange={e => setMachineData({...machineData, maintenance_limit_hours: e.target.value})} required />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flex: 1 }}>
              <button type="submit" className="btn btn-accent">Guardar</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowMachineForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showActionForm && showActionForm !== 'report' && (
        <div className="card mb-4" style={{ backgroundColor: '#fdfdfd', border: '1px solid var(--color-primary)' }}>
          <h3>Registrar {showActionForm === 'usage' ? 'Uso' : showActionForm === 'incident' ? 'Incidencia' : 'Mantenimiento'} para {selectedMachine.name}</h3>
          <form onSubmit={handleActionSubmit} style={{ marginTop: '1rem' }}>
            {showActionForm === 'usage' && (
              <div className="input-group mb-2">
                <label className="input-label">Horas de Uso</label>
                <input type="number" step="0.1" className="input-field" value={actionData.hours_used || ''} onChange={e => setActionData({...actionData, hours_used: e.target.value})} required />
              </div>
            )}
            
            {showActionForm === 'maintenance' && (
              <>
                <div className="input-group mb-2">
                  <label className="input-label">Tipo de Mantenimiento</label>
                  <select className="input-field" value={actionData.type} onChange={e => setActionData({...actionData, type: e.target.value})}>
                    <option value="preventive">Preventivo (Resetea horas)</option>
                    <option value="corrective">Correctivo</option>
                  </select>
                </div>
                <div className="input-group mb-2">
                  <label className="input-label">Costo Estimado</label>
                  <input type="number" step="0.1" className="input-field" value={actionData.cost || ''} onChange={e => setActionData({...actionData, cost: e.target.value})} />
                </div>
              </>
            )}

            <div className="input-group mb-2">
              <label className="input-label">Descripción</label>
              <textarea className="input-field" value={actionData.description || ''} onChange={e => setActionData({...actionData, description: e.target.value})} required={showActionForm !== 'usage'}></textarea>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-accent">Guardar Registro</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowActionForm(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showActionForm === 'report' && reportData && (
        <div className="card mb-4" style={{ position: 'relative' }}>
          <button style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setShowActionForm(null)}>✖</button>
          <h3>Reporte de: {reportData.machine.name} ({reportData.machine.type})</h3>
          <p><strong>Estado:</strong> {reportData.machine.status} | <strong>Horas Acumuladas:</strong> {reportData.machine.accumulated_hours}</p>
          
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h4>Últimos Usos</h4>
              {reportData.usages.length === 0 ? <p>No hay usos registrados.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {reportData.usages.slice(0, 5).map(u => (
                    <li key={u.id} style={{ borderBottom: '1px solid #ccc', padding: '0.5rem 0' }}>
                      <strong>{u.date}</strong> - {u.hours_used}h <br/>
                      <small>{u.description}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h4>Incidencias</h4>
              {reportData.incidents.length === 0 ? <p>No hay incidencias.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {reportData.incidents.map(i => (
                    <li key={i.id} style={{ borderBottom: '1px solid #ccc', padding: '0.5rem 0' }}>
                      <strong>{i.date}</strong> - Estado: {i.status} <br/>
                      <small>{i.description}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h4>Mantenimientos</h4>
              {reportData.maintenances.length === 0 ? <p>No hay mantenimientos.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {reportData.maintenances.map(m => (
                    <li key={m.id} style={{ borderBottom: '1px solid #ccc', padding: '0.5rem 0' }}>
                      <strong>{m.date}</strong> - Tipo: {m.type === 'preventive' ? 'Preventivo' : 'Correctivo'} <br/>
                      <small>{m.description}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Máquinas */}
      <div className="grid-cols-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {loading ? <p>Cargando máquinas...</p> : machines.map(machine => {
          const needsMaintenance = machine.accumulated_hours >= machine.maintenance_limit_hours;
          const isOutOfOrder = machine.status === 'out_of_order';

          return (
            <div key={machine.id} className="card" style={{ 
              borderTop: isOutOfOrder ? '4px solid #c62828' : needsMaintenance ? '4px solid #f9a825' : '4px solid #2e7d32',
              display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}>
              <h3>{machine.name}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{machine.type}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 'bold' }}>Horas de uso:</span>
                <span style={{ fontSize: '1.1rem', color: needsMaintenance ? '#c62828' : 'inherit' }}>
                  {machine.accumulated_hours} / {machine.maintenance_limit_hours}h
                </span>
              </div>
              
              {needsMaintenance && (
                <div style={{ backgroundColor: '#fff3e0', color: '#e65100', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
                  ⚠️ Requiere Mantenimiento Preventivo
                </div>
              )}
              {isOutOfOrder && (
                <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
                  ❌ Fuera de Servicio
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: 'auto', paddingTop: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }} onClick={() => openActionForm(machine, 'usage')}>Registrar Uso</button>
                <button className="btn" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', backgroundColor: '#e53935', color: 'white' }} onClick={() => openActionForm(machine, 'incident')}>Reportar Falla</button>
                <button className="btn" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', backgroundColor: '#fb8c00', color: 'white' }} onClick={() => openActionForm(machine, 'maintenance')}>Mantenimiento</button>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }} onClick={() => fetchReport(machine)}>Reporte</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Machines;
