import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, FileText, Table } from 'lucide-react';
import api from '../api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Reports = () => {
  const [stats, setStats] = useState({
    services_by_type: [],
    machine_usage: [],
    critical_inventory: [],
    users_by_type: []
  });
  const [loading, setLoading] = useState(true);

  // Export Form State
  const [exportData, setExportData] = useState({
    module: 'services',
    format: 'excel',
    start_date: '',
    end_date: ''
  });

  const fetchStats = async () => {
    try {
      const response = await api.get('/reports/stats');
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExport = () => {
    const { module, format, start_date, end_date } = exportData;
    let url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/reports/export?module=${module}&format=${format}`;
    if (start_date) url += `&start_date=${start_date}`;
    if (end_date) url += `&end_date=${end_date}`;
    
    // Add Authorization header trick if needed via token param, but normally for File downloads 
    // it's tricky with JWT. For simplicity in this demo, the backend relies on token. 
    // If backend requires auth for /export, we append token to URL (if backend supports it)
    // Here we'll append token as query param so backend can verify if modified to accept it.
    // Wait, the backend uses `Depends(auth.RoleChecker(["admin"]))` which expects a Bearer token.
    // Standard `window.open` doesn't send Authorization headers.
    // We will use fetch/blob to handle this correctly.
    
    fetchWithAuthAndDownload(url, `${module}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
  };

  const fetchWithAuthAndDownload = async (url, filename) => {
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      alert("Error al exportar. Revisa tus permisos e inténtalo de nuevo.");
      console.error(error);
    }
  };

  return (
    <div>
      <h1 className="mb-4" style={{ color: 'var(--color-primary)' }}>Reportes y Estadísticas</h1>
      
      {/* Panel de Exportación (HU21, HU22) */}
      <div className="card mb-4" style={{ backgroundColor: 'var(--color-surface)' }}>
        <h2 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={24} /> Exportación de Datos Históricos
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label className="input-label">Módulo</label>
            <select className="input-field" value={exportData.module} onChange={e => setExportData({...exportData, module: e.target.value})}>
              <option value="services">Servicios</option>
              <option value="machines">Máquinas</option>
              <option value="inventory">Inventario</option>
              <option value="users">Usuarios</option>
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label className="input-label">Fecha Inicio (Opcional)</label>
            <input type="date" className="input-field" value={exportData.start_date} onChange={e => setExportData({...exportData, start_date: e.target.value})} />
          </div>
          <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label className="input-label">Fecha Fin (Opcional)</label>
            <input type="date" className="input-field" value={exportData.end_date} onChange={e => setExportData({...exportData, end_date: e.target.value})} />
          </div>
          <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label className="input-label">Formato</label>
            <select className="input-field" value={exportData.format} onChange={e => setExportData({...exportData, format: e.target.value})}>
              <option value="excel">Excel (.xlsx)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
            {exportData.format === 'excel' ? <Table size={18} /> : <FileText size={18} />}
            Descargar
          </button>
        </div>
      </div>

      {/* Gráficos Estadísticos (HU23) */}
      <h2 className="mb-4">Indicadores del Laboratorio</h2>
      {loading ? (
        <p>Cargando estadísticas...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          {/* Servicios por Tipo */}
          <div className="card">
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Servicios por Tipo</h3>
            {stats.services_by_type.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={stats.services_by_type} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {stats.services_by_type.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p style={{ textAlign: 'center', color: '#777' }}>No hay datos.</p>}
          </div>

          {/* Usuarios por Tipo */}
          <div className="card">
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Usuarios por Tipo</h3>
            {stats.users_by_type.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={stats.users_by_type} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {stats.users_by_type.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p style={{ textAlign: 'center', color: '#777' }}>No hay datos.</p>}
          </div>

          {/* Uso de Máquinas */}
          <div className="card">
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Uso de Máquinas (Horas)</h3>
            {stats.machine_usage.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.machine_usage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" name="Horas Acumuladas" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p style={{ textAlign: 'center', color: '#777' }}>No hay datos.</p>}
          </div>

          {/* Inventario Crítico */}
          <div className="card">
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Inventario en Nivel Crítico</h3>
            {stats.critical_inventory.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.critical_inventory} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="stock" name="Stock Actual" fill="#FF8042" />
                    <Bar dataKey="min" name="Mínimo Requerido" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#2e7d32', flexDirection: 'column' }}>
                <p><strong>Todo el inventario está en niveles óptimos.</strong></p>
                <p>No hay insumos críticos.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default Reports;
