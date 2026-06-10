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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [servicesRes, usersRes, mlRes, projRes] = await Promise.all([
          api.get('/services/requests'),
          api.get('/lab-users/'),
          api.get('/ml/predict-demand'),
          api.get('/ml/service-projections')
        ]);
        
        const activeCount = servicesRes.data.filter(s => s.status === 'pending' || s.status === 'in_progress').length;
        
        setStats({
          activeServices: activeCount,
          registeredUsers: usersRes.data.length,
          demandPrediction: mlRes.data.total_predicted_next_30_days
        });
        
        setPredictions(mlRes.data.predictions.slice(0, 7)); // Primeros 7 días para el gráfico
        setServiceProjections(projRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <div>
      <h1 className="mb-4">Panel Principal</h1>
      
      {loading ? (
        <p>Cargando información del sistema...</p>
      ) : (
        <>
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
              <h3 style={{ color: 'var(--color-text-muted)' }}>Predicción de Demanda (30 días)</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-accent-dark)' }}>{stats.demandPrediction}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Proyección IA (Meta Prophet)</p>
            </div>
          </div>

          <div className="card mt-4">
            <h3>Predicción Próximos 7 días (Modelo Prophet)</h3>
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
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--color-surface-hover)', textAlign: 'center' }}>SOLICITUDES (mes anterior)</th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--color-surface-hover)', textAlign: 'center' }}>PROYECCIÓN (mes siguiente)</th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--color-surface-hover)', textAlign: 'center' }}>TENDENCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceProjections.map((proj, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{proj.service_name}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>{proj.last_month_requests}</td>
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
