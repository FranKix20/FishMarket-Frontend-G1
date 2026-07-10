import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page container" style={{ textAlign: 'center', paddingTop: 96 }}>
      <div style={{ fontSize: 48 }}>🪝</div>
      <h1 style={{ marginTop: 16 }}>Página no encontrada</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
        Este anzuelo salió vacío. Vuelve al catálogo.
      </p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
        Ir al catálogo
      </Link>
    </div>
  );
}
