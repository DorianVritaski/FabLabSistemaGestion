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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [servicesRes, usersRes, mlRes] = await Promise.all([
          api.get('/services/requests'),
          api.get('/lab-users/'),
          api.get('/ml/predict-demand')
        ]);
        
        const activeCount = servicesRes.data.filter(s => s.status === 'pending' || s.status === 'in_progress').length;
        
        setStats({
          activeServices: activeCount,
          registeredUsers: usersRes.data.length,
          demandPrediction: mlRes.data.total_predicted_next_30_days
        });
        
        setPredictions(mlRes.data.predictions.slice(0, 7)); // Primeros 7 días para el gráfico
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
              * Los datos actualmente se generan mediante un mock histórico ajustado al modelo Prophet para demostración.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
