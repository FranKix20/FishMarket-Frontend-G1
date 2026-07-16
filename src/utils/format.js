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

// Fecha relativa ("hace 5 min", "hace 2 h") para listados donde la fecha
// exacta importa menos que "qué tan reciente es esto" a primera vista.
export const formatRelativeDate = (isoString) => {
  if (!isoString) return '—';
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Recién ahora';
  if (min < 60) return `Hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days} d`;
  return formatDate(isoString);
};

// Secuencia lineal de estados de un pedido (Grupo 5). Se usa tanto en el
// listado (mini progreso) como en el detalle (tracker completo). Estados
// terminales o fuera de línea (CANCELLED, OUT_OF_STOCK) no tienen índice.
export const ORDER_FLOW = ['CREATED', 'STOCK_RESERVED', 'PAID', 'SHIPPED', 'DELIVERED'];
export const orderFlowIndex = (status) => ORDER_FLOW.indexOf(status);
export const isTerminalOrderStatus = (status) => ['DELIVERED', 'CANCELLED', 'OUT_OF_STOCK'].includes(status);

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

// Estados del servicio de Pagos (Grupo 6): PENDING / APPROVED / REJECTED.
// UNAVAILABLE es propio del BFF: significa que el pago no se pudo
// sincronizar con G6 (servicio caído), no un estado real del pago.
export function paymentStatusPillClass(status) {
  const map = {
    PENDING: 'pill-warning',
    APPROVED: 'pill-success',
    REJECTED: 'pill-danger',
    UNAVAILABLE: 'pill-neutral'
  };
  return map[status] || 'pill-neutral';
}

export function paymentStatusLabel(status) {
  const map = {
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    UNAVAILABLE: 'Por confirmar'
  };
  return map[status] || status || 'Desconocido';
}
