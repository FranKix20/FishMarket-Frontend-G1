export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      aria-label="Paginación de resultados"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 32 }}
    >
      <button className="btn btn-secondary btn-sm" disabled={!canPrev} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      <span className="mono" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        página {page} de {totalPages}
      </span>
      <button className="btn btn-secondary btn-sm" disabled={!canNext} onClick={() => onChange(page + 1)}>
        Siguiente →
      </button>
    </nav>
  );
}
