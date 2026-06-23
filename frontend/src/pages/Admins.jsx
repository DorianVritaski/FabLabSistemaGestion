import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Shield } from 'lucide-react';
import api from '../api';

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'operador',
    is_active: true
  });
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const fetchAdmins = async () => {
    try {
      const response = await api.get('/auth/admins');
      setAdmins(response.data);
    } catch (error) {
      if(error.response?.status === 403) {
        setError('No tienes permisos para ver esta sección. Se requiere rol de Administrador.');
      } else {
        console.error("Error fetching admins", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'operador',
      is_active: true
    });
    setEditingAdminId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage({ type: '', text: '' });
    
    // Validar contraseña requerida en creación
    if (!editingAdminId && !formData.password) {
      setFormMessage({ type: 'error', text: 'La contraseña es obligatoria para nuevos usuarios' });
      return;
    }

    try {
      if (editingAdminId) {
        await api.put(`/auth/admins/${editingAdminId}`, formData);
        setFormMessage({ type: 'success', text: 'Administrador actualizado exitosamente' });
      } else {
        await api.post('/auth/register', formData);
        setFormMessage({ type: 'success', text: 'Administrador registrado exitosamente' });
      }
      resetForm();
      fetchAdmins();
    } catch (error) {
      setFormMessage({ type: 'error', text: error.response?.data?.detail || 'Error al procesar la solicitud' });
    }
  };

  const handleEdit = (admin) => {
    setEditingAdminId(admin.id);
    setFormData({
      username: admin.username,
      password: '', // No mostrar contraseña
      role: admin.role,
      is_active: admin.is_active
    });
    setFormMessage({ type: '', text: '' });
  };

  const handleDelete = async (adminId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este administrador?')) {
      try {
        await api.delete(`/auth/admins/${adminId}`);
        fetchAdmins();
        if (editingAdminId === adminId) resetForm();
      } catch (error) {
        alert(error.response?.data?.detail || "Error al eliminar el administrador");
      }
    }
  };

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#c62828' }}>
        <Shield size={64} style={{ marginBottom: '1rem', opacity: 0.8 }} />
        <h2>Acceso Denegado</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4" style={{ color: 'var(--color-primary)' }}>Gestión de Administradores</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Controla el acceso al sistema y los roles (Administrador, Operador, Visor).</p>
      
      <div className="grid-cols-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Formulario de Registro / Edición */}
        <div className="card">
          <h2 className="mb-4">{editingAdminId ? 'Editar Cuenta' : 'Registrar Cuenta'}</h2>
          
          {formMessage.text && (
            <div style={{ 
              padding: '0.75rem', 
              marginBottom: '1rem', 
              borderRadius: 'var(--radius-sm)',
              backgroundColor: formMessage.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: formMessage.type === 'success' ? '#2e7d32' : '#c62828'
            }}>
              {formMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Usuario</label>
              <input type="text" name="username" className="input-field" value={formData.username} onChange={handleInputChange} required />
            </div>
            
            <div className="input-group">
              <label className="input-label">{editingAdminId ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</label>
              <input type="password" name="password" className="input-field" value={formData.password} onChange={handleInputChange} />
              {editingAdminId && <small style={{ color: 'var(--color-text-muted)' }}>Déjalo en blanco para mantener la actual.</small>}
            </div>

            <div className="input-group">
              <label className="input-label">Rol del Sistema</label>
              <select name="role" className="input-field" value={formData.role} onChange={handleInputChange} required>
                <option value="admin">Administrador (Acceso Total)</option>
                <option value="operador">Operador (Uso diario, sin reportes/admin)</option>
                <option value="visor">Visor (Solo lectura)</option>
              </select>
            </div>

            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleInputChange} />
              <label htmlFor="is_active" style={{ margin: 0, cursor: 'pointer' }}>Usuario Activo</label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingAdminId ? 'Actualizar' : 'Registrar'}
              </button>
              {editingAdminId && (
                <button type="button" className="btn btn-accent" onClick={resetForm} style={{ flex: 1 }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Administradores */}
        <div className="card">
          <h2 className="mb-4">Cuentas del Sistema</h2>
          
          {loading ? (
            <p>Cargando administradores...</p>
          ) : admins.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No se encontraron administradores.</p>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: 'var(--color-surface)', borderBottom: '2px solid var(--color-surface-hover)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem' }}>ID</th>
                    <th style={{ padding: '0.75rem' }}>Usuario</th>
                    <th style={{ padding: '0.75rem' }}>Rol</th>
                    <th style={{ padding: '0.75rem' }}>Estado</th>
                    <th style={{ padding: '0.75rem' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>#{admin.id}</td>
                      <td style={{ padding: '0.75rem' }}>{admin.username}</td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '1rem', 
                          backgroundColor: admin.role === 'admin' ? '#e3f2fd' : admin.role === 'operador' ? '#fff3e0' : '#eceff1',
                          color: admin.role === 'admin' ? '#1565c0' : admin.role === 'operador' ? '#e65100' : '#455a64'
                        }}>
                          {admin.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ color: admin.is_active ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>
                          {admin.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEdit(admin)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}>
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDelete(admin.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c62828' }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admins;
