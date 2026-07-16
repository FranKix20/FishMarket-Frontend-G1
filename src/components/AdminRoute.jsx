import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Tideline from './Tideline';

/**
 * Protege rutas que SOLO pueden ver administradores. Si no hay sesión, manda a
 * login; si hay sesión pero no es admin, manda al catálogo (no revela el panel).
 */
export default function AdminRoute({ children }) {
  const { isAuthenticated, checkingSession, user } = useAuth();
  const location = useLocation();

  if (checkingSession) {
    return (
      <div className="container" style={{ paddingTop: 96, textAlign: 'center' }}>
        <Tideline loading />
        <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Verificando sesión…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
