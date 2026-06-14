import React, { useState, useEffect } from 'react';
import api from '../api';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemData, setItemData] = useState({ name: '', category: 'Material', unit: 'unidades', minimum_stock: 0 });
  
  const [showActionForm, setShowActionForm] = useState(null); // 'transaction', 'order', 'report'
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [actionData, setActionData] = useState({});
  const [reportData, setReportData] = useState(null);

  const fetchItems = async () => {
    try {
      const res = await api.get('/inventory');
      setItems(res.data);
    } catch (error) {
      console.error("Error fetching inventory", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory', {
        ...itemData,
        minimum_stock: parseFloat(itemData.minimum_stock)
      });
      setShowItemForm(false);
      setItemData({ name: '', category: 'Material', unit: 'unidades', minimum_stock: 0 });
      fetchItems();
    } catch (error) {
      alert("Error al crear ítem de inventario");
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (showActionForm === 'transaction') {
        await api.post(`/inventory/${selectedItem.id}/transactions`, { 
          type: actionData.type, 
          quantity: parseFloat(actionData.quantity),
          description: actionData.description 
        });
      } else if (showActionForm === 'order') {
        await api.post(`/inventory/${selectedItem.id}/orders`, { 
          quantity: parseFloat(actionData.quantity),
          status: 'planned'
        });
      }
      
      setShowActionForm(null);
      setActionData({});
      fetchItems();
    } catch (error) {
      alert(error.response?.data?.detail || `Error al registrar ${showActionForm}`);
    }
  };

  const fetchReport = async (item) => {
    try {
      const [transactionsRes, ordersRes] = await Promise.all([
        api.get(`/inventory/${item.id}/transactions`),
        api.get(`/inventory/${item.id}/orders`)
      ]);
      setReportData({ item, transactions: transactionsRes.data, orders: ordersRes.data });
      setShowActionForm('report');
      setSelectedItem(item);
    } catch (error) {
      alert("Error al obtener el reporte");
    }
  };

  const completeOrder = async (orderId) => {
    if (!window.confirm('¿Confirmar recepción del pedido? Esto aumentará el stock actual.')) return;
    try {
      await api.put(`/inventory/${selectedItem.id}/orders/${orderId}/complete`);
      fetchReport(selectedItem); // Refresh report
      fetchItems(); // Refresh main list
    } catch (error) {
      alert("Error al completar el pedido");
    }
  };

  const openActionForm = (item, actionType) => {
    setSelectedItem(item);
    setShowActionForm(actionType);
    if (actionType === 'transaction') {
      setActionData({ type: 'out', quantity: '', description: '' });
    } else {
      setActionData({ quantity: '' });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ color: 'var(--color-primary)' }}>Gestión de Inventario</h1>
        <button className="btn btn-primary" onClick={() => setShowItemForm(true)}>+ Nuevo Ítem</button>
      </div>

      {showItemForm && (
        <div className="card mb-4">
          <h3>Registrar Nuevo Material/Insumo</h3>
          <form onSubmit={handleCreateItem} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="input-label">Nombre del Ítem</label>
              <input type="text" className="input-field" value={itemData.name} onChange={e => setItemData({...itemData, name: e.target.value})} required placeholder="Ej: Filamento PLA Azul" />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: '150px' }}>
              <label className="input-label">Categoría</label>
              <input type="text" className="input-field" value={itemData.category} onChange={e => setItemData({...itemData, category: e.target.value})} />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: '100px' }}>
              <label className="input-label">Unidad de Medida</label>
              <input type="text" className="input-field" value={itemData.unit} onChange={e => setItemData({...itemData, unit: e.target.value})} required placeholder="kg, planchas, unidades..." />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: '150px' }}>
              <label className="input-label">Stock Mínimo (Alerta)</label>
              <input type="number" step="0.1" className="input-field" value={itemData.minimum_stock} onChange={e => setItemData({...itemData, minimum_stock: e.target.value})} required />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flex: 1 }}>
              <button type="submit" className="btn btn-accent">Guardar</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowItemForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showActionForm && showActionForm !== 'report' && (
        <div className="card mb-4" style={{ backgroundColor: '#fdfdfd', border: '1px solid var(--color-primary)' }}>
          <h3>{showActionForm === 'transaction' ? 'Movimiento de Inventario' : 'Planificar Pedido de Reposición'} para {selectedItem.name}</h3>
          <form onSubmit={handleActionSubmit} style={{ marginTop: '1rem' }}>
            {showActionForm === 'transaction' && (
              <div className="input-group mb-2">
                <label className="input-label">Tipo de Movimiento</label>
                <select className="input-field" value={actionData.type} onChange={e => setActionData({...actionData, type: e.target.value})}>
                  <option value="out">Salida (Consumo)</option>
                  <option value="in">Entrada (Abastecimiento)</option>
                </select>
              </div>
            )}
            
            <div className="input-group mb-2">
              <label className="input-label">Cantidad ({selectedItem.unit})</label>
              <input type="number" step="0.1" className="input-field" value={actionData.quantity || ''} onChange={e => setActionData({...actionData, quantity: e.target.value})} required />
            </div>

            {showActionForm === 'transaction' && (
              <div className="input-group mb-2">
                <label className="input-label">Descripción o Motivo</label>
                <textarea className="input-field" value={actionData.description || ''} onChange={e => setActionData({...actionData, description: e.target.value})}></textarea>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-accent">Guardar Registro</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowActionForm(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {showActionForm === 'report' && reportData && (
        <div className="card mb-4" style={{ position: 'relative' }}>
          <button style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setShowActionForm(null)}>✖</button>
          <h3>Reporte de Inventario: {reportData.item.name}</h3>
          <p><strong>Stock Actual:</strong> {reportData.item.current_stock} {reportData.item.unit} | <strong>Mínimo:</strong> {reportData.item.minimum_stock} {reportData.item.unit}</p>
          
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: '300px' }}>
              <h4>Últimos Movimientos</h4>
              {reportData.transactions.length === 0 ? <p>No hay movimientos registrados.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fecha</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tipo</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Cant.</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.transactions.slice(0, 10).map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5rem' }}>{t.date}</td>
                        <td style={{ padding: '0.5rem', color: t.type === 'in' ? 'green' : 'red', fontWeight: 'bold' }}>
                          {t.type === 'in' ? '+ Entrada' : '- Salida'}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{t.quantity} {reportData.item.unit}</td>
                        <td style={{ padding: '0.5rem', fontSize: '0.9rem', color: '#666' }}>{t.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h4>Pedidos de Reposición</h4>
              {reportData.orders.length === 0 ? <p>No hay pedidos.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {reportData.orders.map(o => (
                    <li key={o.id} style={{ borderBottom: '1px solid #ccc', padding: '0.5rem 0' }}>
                      <strong>{o.date}</strong> - {o.quantity} {reportData.item.unit} <br/>
                      Estado: <span style={{ fontWeight: 'bold', color: o.status === 'completed' ? 'green' : 'orange' }}>{o.status === 'completed' ? 'Completado' : 'Planificado'}</span>
                      {o.status === 'planned' && (
                        <button className="btn btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', marginLeft: '0.5rem', backgroundColor: '#4caf50', color: 'white' }} onClick={() => completeOrder(o.id)}>
                          ✔ Recibir
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Inventario */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <thead style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Ítem</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Categoría</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Stock Actual</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center' }}>Cargando inventario...</td></tr> : 
             items.length === 0 ? <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center' }}>No hay ítems registrados</td></tr> :
             items.map(item => {
              const lowStock = item.current_stock <= item.minimum_stock;

              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee', backgroundColor: lowStock ? '#fff3e0' : 'transparent' }}>
                  <td style={{ padding: '1rem' }}><strong>{item.name}</strong></td>
                  <td style={{ padding: '1rem' }}>{item.category || '-'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: lowStock ? '#e65100' : 'inherit' }}>
                    {item.current_stock} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{item.unit}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {lowStock ? (
                      <span style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>Stock Bajo</span>
                    ) : (
                      <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>Óptimo</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => openActionForm(item, 'transaction')}>E/S</button>
                      <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#1976d2', color: 'white' }} onClick={() => openActionForm(item, 'order')}>Pedir</button>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => fetchReport(item)}>Detalles</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
