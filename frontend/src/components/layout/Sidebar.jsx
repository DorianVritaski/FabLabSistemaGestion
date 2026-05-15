import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Settings, LogOut, Printer } from 'lucide-react';

const Sidebar = ({ onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Printer size={28} color="var(--color-primary)" />
        <h2>Fab Lab UNCP</h2>
      </div>
      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <Home size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink 
          to="/users" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <Users size={20} />
          <span>Usuarios</span>
        </NavLink>
        <NavLink 
          to="/services" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <Settings size={20} />
          <span>Servicios</span>
        </NavLink>
      </nav>
      <div style={{ padding: '1.5rem', borderTop: '1px solid #e9ecef' }}>
        <button onClick={onLogout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
