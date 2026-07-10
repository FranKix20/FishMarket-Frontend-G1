import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Tideline from './Tideline';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, checkingSession } = useAuth();
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

  return children;
}
