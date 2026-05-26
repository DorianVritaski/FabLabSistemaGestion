import React, { useState, useEffect } from 'react';
import api from '../api';

const Services = () => {
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formularios
  const [newType, setNewType] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    service_type_id: '',
    start_date: '',
    end_date: '',
    details: '',
    status: 'pending',
    selectedUsers: [] // IDs de los usuarios seleccionados
  });
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  const fetchData = async () => {
    try {
      const [servicesRes, typesRes, usersRes] = await Promise.all([
        api.get('/services/requests'),
        api.get('/services/types'),
        api.get('/lab-users/')
      ]);
      setServices(servicesRes.data);
      setServiceTypes(typesRes.data);
      setUsers(usersRes.data);
      
      if (typesRes.data.length > 0 && !formData.service_type_id) {
        setFormData(prev => ({ ...prev, service_type_id: typesRes.data[0].id }));
      }
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      await api.post('/services/types', { name: newType, description: '' });
      setNewType('');
      fetchData();
    } catch (error) {
      alert("Error al crear tipo de servicio");
    }
  };

  const handleUserSelection = (userId) => {
    setFormData(prev => {
      const selected = prev.selectedUsers;
      if (selected.includes(userId)) {
        return { ...prev, selectedUsers: selected.filter(id => id !== userId) };
      } else {
        if (selected.length >= 8) {
          alert("Máximo 8 usuarios por solicitud.");
          return prev;
        }
        return { ...prev, selectedUsers: [...selected, userId] };
      }
    });
  };

  const handleEditService = (service) => {
    setEditingServiceId(service.id);
    setFormData({
      service_type_id: service.service_type_id,
      start_date: service.start_date,
      end_date: service.end_date || '',
      details: service.details || '',
      status: service.status || 'pending',
      selectedUsers: service.users ? service.users.map(u => u.id) : []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingServiceId(null);
    setFormData({
      service_type_id: serviceTypes.length > 0 ? serviceTypes[0].id : '',
      start_date: '',
      end_date: '',
      details: '',
      status: 'pending',
      selectedUsers: []
    });
    setFormMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage({ type: '', text: '' });
    
    if (formData.selectedUsers.length === 0) {
      setFormMessage({ type: 'error', text: 'Debe seleccionar al menos un usuario' });
      return;
    }

    try {
      const payload = {
        service_type_id: parseInt(formData.service_type_id),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        details: formData.details,
        status: formData.status,
        lab_user_ids: formData.selectedUsers
      };

      if (editingServiceId) {
        await api.put(`/services/requests/${editingServiceId}`, payload);
        setFormMessage({ type: 'success', text: 'Servicio actualizado exitosamente' });
      } else {
        await api.post('/services/requests', payload);
        setFormMessage({ type: 'success', text: 'Servicio registrado exitosamente' });
      }
      
      fetchData();
      setTimeout(resetForm, 1500); // Reset form after showing success message briefly
    } catch (error) {
      setFormMessage({ type: 'error', text: error.response?.data?.detail || 'Error al guardar servicio' });
    }
  };

  const downloadPDF = async (requestId) => {
    try {
      const response = await api.get(`/services/requests/${requestId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `declaracion_jurada_${requestId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert("Error al descargar el PDF. Asegúrate de que el endpoint exista.");
    }
  };

  const filteredUsersForService = users.filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const dni = user.dni ? user.dni.toLowerCase() : '';
    return fullName.includes(searchLower) || dni.includes(searchLower);
  });

  return (
    <div>
      <h1 className="mb-4" style={{ color: 'var(--color-primary)' }}>Coordinación de Servicios</h1>
      
      <div className="grid-cols-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        
        {/* Formulario de Solicitud */}
        <div className="card">
          <h2 className="mb-4">{editingServiceId ? 'Editar Servicio' : 'Registrar Nuevo Servicio'}</h2>
          
          {formMessage.text && (
            <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-sm)', backgroundColor: formMessage.type === 'success' ? '#e8f5e9' : '#ffebee', color: formMessage.type === 'success' ? '#2e7d32' : '#c62828' }}>
              {formMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Tipo de Servicio</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select 
                  name="service_type_id" 
                  className="input-field" 
                  style={{ flex: 1 }}
                  value={formData.service_type_id} 
                  onChange={e => setFormData({...formData, service_type_id: e.target.value})} 
                  required={serviceTypes.length > 0}
                >
                  {serviceTypes.length === 0 && <option value="">No hay tipos registrados</option>}
                  {serviceTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                
                {/* Miniformulario integrado para añadir tipos nuevos */}
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Añadir nuevo tipo..." 
                  style={{ width: '180px' }} 
                  value={newType} 
                  onChange={e => setNewType(e.target.value)} 
                />
                <button type="button" className="btn btn-accent" onClick={handleCreateType}>Añadir</button>
              </div>
            </div>
              
              <div className="grid-cols-2">
                <div className="input-group">
                  <label className="input-label">Fecha de Inicio</label>
                  <input type="date" className="input-field" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Fecha de Término (Aprox)</label>
                  <input type="date" className="input-field" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Seleccionar Usuarios (Máx 8)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="🔍 Buscar estudiante por nombre o DNI..." 
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  style={{ marginBottom: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                />
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                  {filteredUsersForService.length === 0 ? <p style={{ fontSize: '0.875rem' }}>No hay usuarios encontrados</p> : filteredUsersForService.map(user => (
                    <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelection(user.id)}
                      />
                      <span style={{ fontSize: '0.875rem' }}><strong style={{ color: 'var(--color-primary)' }}>#{user.id}</strong> {user.first_name} {user.last_name} ({user.institutional_email})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Detalles / Indicaciones del material</label>
                <textarea className="input-field" rows="3" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} placeholder="Ej. Filamento PLA color verde..."></textarea>
              </div>

              {editingServiceId && (
                <div className="input-group">
                  <label className="input-label">Estado del Servicio</label>
                  <select className="input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Finalizado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingServiceId ? 'Actualizar Servicio' : 'Registrar Servicio'}
                </button>
                {editingServiceId && (
                  <button type="button" className="btn btn-accent" onClick={resetForm} style={{ flex: 1 }}>
                    Cancelar
                  </button>
                )}
              </div>
          </form>
        </div>

        {/* Historial de Servicios */}
        <div className="card">
          <h2 className="mb-4">Historial de Solicitudes</h2>
          {loading ? (
            <p>Cargando servicios...</p>
          ) : services.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No hay solicitudes registradas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {services.map(service => (
                <div key={service.id} style={{ border: '1px solid var(--color-surface-hover)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>{service.service_type.name}</h3>
                    <span style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-main)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {service.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                    <strong>Fechas:</strong> {service.start_date} al {service.end_date || 'Pendiente'}
                  </p>
                  <p style={{ fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                    <strong>Integrantes ({service.users.length}):</strong> {service.users.map(u => u.first_name).join(', ')}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => downloadPDF(service.id)} className="btn btn-accent" style={{ flex: 1, fontSize: '0.875rem', padding: '0.4rem' }}>
                      📄 Declaración Jurada
                    </button>
                    <button onClick={() => handleEditService(service)} className="btn btn-outline" style={{ flex: 1, fontSize: '0.875rem', padding: '0.4rem' }}>
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Services;
