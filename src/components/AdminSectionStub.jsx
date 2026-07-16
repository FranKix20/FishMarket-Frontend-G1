/**
 * Apartado "en construcción" reutilizable para las secciones del panel que G1
 * aún debe implementar. Muestra el objetivo de la sección, un checklist de lo
 * que falta, la fuente de datos (grupo/endpoint) y un esqueleto de la UI
 * (tabla o tarjetas) para dejar claro el layout esperado.
 */
export default function AdminSectionStub({
  title,
  subtitle,
  primaryLabel,
  description,
  todos = [],
  columns = [],
  metrics = [],
  backend
}) {
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>
            {title} <span className="admin-wip">En construcción</span>
          </h1>
          <p className="admin-sub">{subtitle}</p>
        </div>
        {primaryLabel && (
          <button className="btn btn-primary" disabled title="Pendiente de implementar por G1">
            {primaryLabel}
          </button>
        )}
      </div>

      <div className="card panel admin-stub-note">
        <p>{description}</p>
        {todos.length > 0 && (
          <>
            <h3>Qué implementar</h3>
            <ul className="admin-stub-todos">
              {todos.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </>
        )}
        {backend && (
          <p className="admin-stub-backend">
            <strong>Fuente de datos:</strong> {backend}
          </p>
        )}
      </div>

      {metrics.length > 0 && (
        <div className="admin-metrics">
          {metrics.map((m) => (
            <div key={m} className="card panel admin-metric">
              <span className="admin-metric__label">{m}</span>
              <span className="admin-metric__value">—</span>
            </div>
          ))}
        </div>
      )}

      {columns.length > 0 && (
        <div className="card admin-table-wrap admin-stub-table">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columns.length} className="admin-empty">
                  Aquí irá el listado. Sección pendiente de implementar por G1.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
