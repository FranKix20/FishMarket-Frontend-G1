export const formatCLP = (value) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);

export const formatDate = (isoString) => {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
};

// Mapea los estados que ya observamos en Grupo 5 (CREATED, STOCK_RESERVED,
// PAID, etc.) a una variante de pill. Cualquier estado no listado cae en
// "neutral" en vez de romper la UI — el ecosistema puede sumar estados
// nuevos sin que el frontend tenga que anticiparlos todos.
export function statusPillClass(status) {
  const map = {
    CREATED: 'pill-neutral',
    STOCK_RESERVED: 'pill-warning',
    PAID: 'pill-success',
    SHIPPED: 'pill-success',
    DELIVERED: 'pill-success',
    CANCELLED: 'pill-danger',
    OUT_OF_STOCK: 'pill-danger'
  };
  return map[status] || 'pill-neutral';
}

export function statusLabel(status) {
  const map = {
    CREATED: 'Creado',
    STOCK_RESERVED: 'Stock reservado',
    PAID: 'Pagado',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    OUT_OF_STOCK: 'Sin stock'
  };
  return map[status] || status || 'Desconocido';
}
