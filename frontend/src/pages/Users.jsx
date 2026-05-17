import React, { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    phone_number: '',
    user_type: 'estudiante',
    career: '',
    institutional_email: ''
  });
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const fetchUsers = async () => {
    try {
      const response = await api.get('/lab-users/');
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      dni: '',
      phone_number: '',
      user_type: 'estudiante',
      career: '',
      institutional_email: ''
    });
    setEditingUserId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage({ type: '', text: '' });
    try {
      if (editingUserId) {
        await api.put(`/lab-users/${editingUserId}`, formData);
        setFormMessage({ type: 'success', text: 'Usuario actualizado exitosamente' });
      } else {
        await api.post('/lab-users/', formData);
        setFormMessage({ type: 'success', text: 'Usuario registrado exitosamente' });
      }
      resetForm();
      fetchUsers();
    } catch (error) {
      setFormMessage({ type: 'error', text: error.response?.data?.detail || 'Error al procesar la solicitud' });
    }
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      dni: user.dni || '',
      phone_number: user.phone_number || '',
      user_type: user.user_type,
      career: user.career || '',
      institutional_email: user.institutional_email
    });
    setFormMessage({ type: '', text: '' });
  };

  const handleDelete = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        await api.delete(`/lab-users/${userId}`);
        fetchUsers();
        if (editingUserId === userId) resetForm();
      } catch (error) {
        alert("Error al eliminar el usuario");
      }
    }
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const dni = user.dni ? user.dni.toLowerCase() : '';
    return fullName.includes(searchLower) || dni.includes(searchLower);
  });

  return (
    <div>
      <h1 className="mb-4" style={{ color: 'var(--color-primary)' }}>Gestión de Usuarios</h1>
      
      <div className="grid-cols-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Formulario de Registro / Edición */}
        <div className="card">
          <h2 className="mb-4">{editingUserId ? 'Editar Usuario' : 'Registrar Usuario'}</h2>
          
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
              <label className="input-label">Nombres</label>
              <input type="text" name="first_name" className="input-field" value={formData.first_name} onChange={handleInputChange} required />
            </div>
            <div className="input-group">
              <label className="input-label">Apellidos</label>
              <input type="text" name="last_name" className="input-field" value={formData.last_name} onChange={handleInputChange} required />
            </div>
            <div className="grid-cols-2" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">DNI</label>
                <input type="text" name="dni" className="input-field" value={formData.dni} onChange={handleInputChange} required />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Celular</label>
                <input type="text" name="phone_number" className="input-field" value={formData.phone_number} onChange={handleInputChange} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Tipo de Usuario</label>
              <select name="user_type" className="input-field" value={formData.user_type} onChange={handleInputChange} required>
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                <option value="administrativo">Administrativo</option>
                <option value="externo">Externo</option>
              </select>
            </div>
            {formData.user_type === 'estudiante' && (
              <div className="input-group">
                <label className="input-label">Carrera Profesional</label>
                <select name="career" className="input-field" value={formData.career} onChange={handleInputChange} required>
                  <option value="" disabled>Seleccione una carrera...</option>
                  <option value="Arquitectura">Arquitectura</option>
                  <option value="Ingeniería Civil">Ingeniería Civil</option>
                  <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
                  <option value="Ingeniería Mecánica">Ingeniería Mecánica</option>
                  <option value="Ingeniería Eléctrica y Electrónica">Ingeniería Eléctrica y Electrónica</option>
                  <option value="Ingeniería Metalúrgica y de Materiales">Ingeniería Metalúrgica y de Materiales</option>
                  <option value="Ingeniería Química">Ingeniería Química</option>
                  <option value="Ingeniería de Minas">Ingeniería de Minas</option>
                  <option value="Ingeniería Forestal y Ambiental">Ingeniería Forestal y Ambiental</option>
                  <option value="Ingeniería en Industrias Alimentarias">Ingeniería en Industrias Alimentarias</option>
                  <option value="Agronomía">Agronomía</option>
                  <option value="Zootecnia">Zootecnia</option>
                  <option value="Administración de Empresas">Administración de Empresas</option>
                  <option value="Contabilidad">Contabilidad</option>
                  <option value="Economía">Economía</option>
                  <option value="Trabajo Social">Trabajo Social</option>
                  <option value="Sociología">Sociología</option>
                  <option value="Antropología">Antropología</option>
                  <option value="Ciencias de la Comunicación">Ciencias de la Comunicación</option>
                  <option value="Enfermería">Enfermería</option>
                  <option value="Medicina Humana">Medicina Humana</option>
                  <option value="Educación">Educación</option>
                  <option value="Otra">Otra</option>
                </select>
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Correo Institucional</label>
              <input type="email" name="institutional_email" className="input-field" value={formData.institutional_email} onChange={handleInputChange} required />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingUserId ? 'Actualizar' : 'Registrar'}
              </button>
              {editingUserId && (
                <button type="button" className="btn btn-accent" onClick={resetForm} style={{ flex: 1 }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Usuarios */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Usuarios Registrados</h2>
            <input 
              type="text" 
              placeholder="🔍 Buscar por Nombre o DNI..." 
              className="input-field"
              style={{ width: '250px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {loading ? (
            <p>Cargando usuarios...</p>
          ) : filteredUsers.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No se encontraron usuarios.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-surface-hover)' }}>
                    <th style={{ padding: '0.75rem' }}>Nombre</th>
                    <th style={{ padding: '0.75rem' }}>DNI</th>
                    <th style={{ padding: '0.75rem' }}>Celular</th>
                    <th style={{ padding: '0.75rem' }}>Tipo</th>
                    <th style={{ padding: '0.75rem' }}>Fecha Reg.</th>
                    <th style={{ padding: '0.75rem' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        {user.first_name} {user.last_name}<br/>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user.institutional_email}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{user.dni || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>{user.phone_number || '-'}</td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{user.user_type}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(user.registration_date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEdit(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}>
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDelete(user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c62828' }}>
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

export default Users;
