import React, { useState, useEffect } from 'react';
import api from '../api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeServices: 0,
    registeredUsers: 0,
    demandPrediction: 0
  });
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [serviceProjections, setServiceProjections] = useState([]);
  const [projectionMonths, setProjectionMonths] = useState(null);
  const [predictionDays, setPredictionDays] = useState(7);
  const [mlMetrics, setMlMetrics] = useState(null);

  // Alertas
  const [alerts, setAlerts] = useState({
    machines: [],
    inventory: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [servicesRes, usersRes, mlRes, projRes, machinesRes, inventoryRes, metricsRes] = await Promise.all([
          api.get('/services/requests'),
          api.get('/lab-users/'),
          api.get(`/ml/predict-demand?days=7`), // Initial fetch for 7 days
          api.get('/ml/service-projections'),
          api.get('/machines'),
          api.get('/inventory'),
          api.get('/ml/evaluate').catch(() => ({ data: null }))
        ]);

        const activeCount = servicesRes.data.filter(s => s.status === 'pending' || s.status === 'in_progress').length;

        const machinesNeedingMaintenance = machinesRes.data.filter(m => m.accumulated_hours >= m.maintenance_limit_hours);
        const inventoryLowStock = inventoryRes.data.filter(i => i.current_stock <= i.minimum_stock);

        setStats({
          activeServices: activeCount,
          registeredUsers: usersRes.data.length,
          demandPrediction: mlRes.data.total_predicted // Changed to total_predicted
        });

        setPredictions(mlRes.data.predictions);
        if (projRes.data.projections) {
          setServiceProjections(projRes.data.projections);
          setProjectionMonths(projRes.data.months);
        } else {
          setServiceProjections(projRes.data); // fallback just in case
        }

        if (metricsRes.data) {
          setMlMetrics(metricsRes.data);
        }

        setAlerts({
          machines: machinesNeedingMaintenance,
          inventory: inventoryLowStock
        });
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handlePredictionDaysChange = async (days) => {
    setPredictionDays(days);
    try {
      const mlRes = await api.get(`/ml/predict-demand?days=${days}`);
      setPredictions(mlRes.data.predictions);
      setStats(prev => ({ ...prev, demandPrediction: mlRes.data.total_predicted }));
    } catch (error) {
      console.error("Error fetching predictions", error);
    }
  };

  return (
    <div>
      <h1 className="mb-4">Panel Principal</h1>

      {loading ? (
        <p>Cargando información del sistema...</p>
      ) : (
        <>
          {(alerts.machines.length > 0 || alerts.inventory.length > 0) && (
            <div className="card mb-4" style={{ backgroundColor: '#fff3e0', border: '1px solid #ff9800' }}>
              <h3 style={{ color: '#e65100', marginBottom: '1rem' }}>⚠️ Alertas del Sistema</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {alerts.machines.map(m => (
                  <div key={`m-${m.id}`} style={{ padding: '0.5rem', backgroundColor: '#fff', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #c62828' }}>
                    <strong>Máquina requiere mantenimiento:</strong> {m.name} ({m.accumulated_hours}/{m.maintenance_limit_hours} hrs)
                  </div>
                ))}
                {alerts.inventory.map(i => (
                  <div key={`i-${i.id}`} style={{ padding: '0.5rem', backgroundColor: '#fff', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #e65100' }}>
                    <strong>Stock Bajo:</strong> {i.name} ({i.current_stock} {i.unit} - Mínimo: {i.minimum_stock})
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid-cols-3">
            <div className="card">
              <h3 style={{ color: 'var(--color-text-muted)' }}>Servicios Activos</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{stats.activeServices}</p>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--color-text-muted)' }}>Usuarios Registrados</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{stats.registeredUsers}</p>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--color-text-muted)' }}>Predicción de Demanda ({predictionDays} días)</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-accent-dark)' }}>{stats.demandPrediction}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Modelo IA Prophet</p>
            </div>
          </div>

          {mlMetrics && (
            <div className="card mt-4" style={{ backgroundColor: '#f8f9fa' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Desempeño del Modelo Predictivo por Servicio (Mensual 80/20)</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Evaluación matemática de la precisión de las predicciones a nivel mensual. Requiere mínimo 6 meses de historial.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ backgroundColor: '#e9ecef', color: '#495057' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6' }}>SERVICIO</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6' }}>ESTADO</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>MESES (TRAIN/TEST)</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>MAE</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>RMSE</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>MAPE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mlMetrics.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: '#fff' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{item.service_name}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {item.status === 'OK' ? (
                            <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✓ Válido</span>
                          ) : (
                            <span style={{ color: '#c62828' }}>{item.status}</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {item.metrics ? `${item.metrics.train_months} / ${item.metrics.test_months}` : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#1565c0', fontWeight: 'bold' }}>
                          {item.metrics ? item.metrics.mae : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#1565c0', fontWeight: 'bold' }}>
                          {item.metrics ? item.metrics.rmse : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#e65100', fontWeight: 'bold' }}>
                          {item.metrics ? (item.metrics.mape !== null ? `${item.metrics.mape}%` : <span style={{ fontSize: '0.75rem', color: '#777', fontWeight: 'normal' }}>Pocos registros</span>) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mlMetrics && (
            <div className="card mt-4" style={{ backgroundColor: '#f8f9fa' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Comparativa Detallada: Real vs. Predicción (Test Set)</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Detalle mensual de los datos que la Inteligencia Artificial usó para autoevaluarse. Esta tabla compara lo que el modelo predijo frente a los datos reales que ya ocurrieron.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {mlMetrics.filter(m => m.status === 'OK' && m.comparison).map((item, idx) => (
                  <div key={idx} style={{ flex: '1', minWidth: '300px', border: '1px solid #dee2e6', borderRadius: '4px', padding: '1rem', backgroundColor: '#fff' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#1565c0' }}>{item.service_name}</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'center' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #dee2e6', color: '#495057' }}>
                          <th style={{ padding: '0.5rem' }}>Mes</th>
                          <th style={{ padding: '0.5rem' }}>Real</th>
                          <th style={{ padding: '0.5rem' }}>Predicción</th>
                          <th style={{ padding: '0.5rem' }}>Margen (Abs.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.comparison.map((comp, cIdx) => (
                          <tr key={cIdx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '0.5rem' }}>{comp.date}</td>
                            <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{comp.real}</td>
                            <td style={{ padding: '0.5rem', color: '#1565c0', fontWeight: 'bold' }}>{comp.predicted}</td>
                            <td style={{ padding: '0.5rem', color: comp.real === comp.predicted ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>
                              {Math.abs(comp.real - comp.predicted)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card mt-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Predicción Próximos {predictionDays} días (Modelo Prophet)</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className={`btn ${predictionDays === 7 ? 'btn-primary' : 'btn-outline'}`} onClick={() => handlePredictionDaysChange(7)} style={{ padding: '0.2rem 0.5rem' }}>7 Días</button>
                <button className={`btn ${predictionDays === 15 ? 'btn-primary' : 'btn-outline'}`} onClick={() => handlePredictionDaysChange(15)} style={{ padding: '0.2rem 0.5rem' }}>15 Días</button>
                <button className={`btn ${predictionDays === 30 ? 'btn-primary' : 'btn-outline'}`} onClick={() => handlePredictionDaysChange(30)} style={{ padding: '0.2rem 0.5rem' }}>30 Días</button>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
              {predictions.map((p, index) => (
                <div key={index} style={{
                  flex: '1', minWidth: '100px', backgroundColor: 'var(--color-surface-hover)',
                  padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center',
                  borderTop: '3px solid var(--color-primary)'
                }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>{p.date}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{p.predicted_demand}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>servicios</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
              * Los datos predictivos se generan utilizando los datos históricos desde la tabla de base de datos conectada.
            </p>
          </div>

          {/* Tabla de Proyecciones por Servicio */}
          <div className="card mt-4">
            <h3 className="mb-4">Proyección de Servicios</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-muted)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--color-surface-hover)' }}>SERVICIO</th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--color-surface-hover)', textAlign: 'center' }}>
                      CERRADO ({projectionMonths ? projectionMonths.prev : 'mes anterior'})
                    </th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--color-surface-hover)', textAlign: 'center' }}>
                      EN CURSO ({projectionMonths ? projectionMonths.current : 'mes actual'})
                    </th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--color-surface-hover)', textAlign: 'center' }}>
                      PROYECCIÓN ({projectionMonths ? projectionMonths.next : 'mes siguiente'})
                    </th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--color-surface-hover)', textAlign: 'center' }}>TENDENCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceProjections.map((proj, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{proj.service_name}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>{proj.last_month_requests}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#1565c0', fontWeight: 'bold' }}>{proj.current_month_requests ?? '-'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>{proj.projected_next_month}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {proj.trend === 'up' && <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>↑ Alza</span>}
                        {proj.trend === 'down' && <span style={{ color: '#c62828', fontWeight: 'bold' }}>↓ Baja</span>}
                        {proj.trend === 'stable' && <span style={{ color: 'var(--color-text-muted)', fontWeight: 'bold' }}>→ Estable</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
