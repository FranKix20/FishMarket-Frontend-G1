import { NavLink, Outlet } from 'react-router-dom';

/**
 * Marco del panel de administración: cabecera + navegación por secciones.
 * Cada sección se renderiza en el <Outlet /> (rutas hijas de /admin).
 * "Usuarios" ya está implementada; el resto son apartados listos para que G1
 * los complete.
 */
const SECTIONS = [
  { to: '/admin/usuarios', label: 'Usuarios' },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/envios', label: 'Envíos' },
  { to: '/admin/reportes', label: 'Reportería' }
];

export default function AdminLayout() {
  return (
    <div className="container admin">
      <div className="admin-topbar">
        <span className="admin-eyebrow">Panel de administración</span>
        <p className="admin-sub">FishMarket Cloud · gestión interna</p>
      </div>

      <nav className="admin-tabs">
        {SECTIONS.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            className={({ isActive }) => `admin-tab ${isActive ? 'is-active' : ''}`}
          >
            {s.label}
          </NavLink>
        ))}
      </nav>

      <div className="admin-section">
        <Outlet />
      </div>
    </div>
  );
}
