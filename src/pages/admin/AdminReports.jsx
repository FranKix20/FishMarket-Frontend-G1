export default function AdminReports() {
  const reportsUrl = import.meta.env.VITE_REPORTS_URL;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Reportería</h1>
          <p className="admin-sub">
            Métricas y reportes del marketplace — servicio de Reportería (Grupo 10).
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        {reportsUrl ? (
          <>
            <p style={{ marginBottom: 20, color: 'var(--color-text-muted)' }}>
              El dashboard de reportería vive en un panel aparte, mantenido por Grupo 10.
              Se abre en una pestaña nueva con tu sesión de administrador.
            </p>
            
              href={reportsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Abrir dashboard de reportería ↗
            </a>
          </>
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Falta configurar la variable <code>VITE_REPORTS_URL</code>.
          </p>
        )}
      </div>
    </>
  );
}
