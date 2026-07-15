/**
 * Cliente directo al Microservicio de Despacho y Logística (Grupo 8) para el
 * panel de administración → sección "Envíos". G8 tiene CORS abierto y, por
 * ahora, sin autenticación real exigida en sus endpoints (el middleware de
 * auth existe en su código pero no está conectado a las rutas todavía), así
 * que se llama directo desde el navegador — mismo patrón que ya se usa con
 * G2 en `identity.js` / `admin.js`.
 *
 * Dos detalles del contrato de G8 que hay que respetar siempre:
 *
 *  - Concurrencia optimista: toda escritura sobre un envío existente
 *    (PATCH de estado, confirmar, rechazar, reenviar) debe mandar el header
 *    `If-Match: "<version>"` con la versión leída en el último GET. Si algo
 *    más lo modificó mientras tanto, G8 responde con error y hay que volver
 *    a cargar el envío antes de reintentar — por eso cada acción acá exige
 *    el `shipment` completo, no solo el id.
 *  - Idempotencia: las tres acciones POST (confirmar/rechazar/reenviar)
 *    llevan un `Idempotency-Key` único por intento, igual que el checkout.
 */
import { ApiError } from './client';

const LOGISTICS_URL = (
  import.meta.env.VITE_LOGISTICS_URL || 'https://arq-microservicio-de-despacho-y-logistica.onrender.com'
).replace(/\/$/, '');

async function g8Request(path, { method = 'GET', body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${LOGISTICS_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No pudimos conectar con el servicio de logística (Grupo 8). Revisa tu conexión e intenta de nuevo.'
    );
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.code || 'UNKNOWN_ERROR',
      payload?.message || `Error ${response.status}`,
      payload?.correlationId
    );
  }

  return payload;
}

const idempotencyKey = (action, shipmentId) => `${action}-${shipmentId}-${Date.now()}`;
const ifMatch = (version) => ({ 'If-Match': `"${version}"` });

export const logisticsApi = {
  list: (page = 1, pageSize = 100) => g8Request(`/v1/shipments?page=${page}&pageSize=${pageSize}`),

  get: (shipmentId) => g8Request(`/v1/shipments/${shipmentId}`),

  drivers: () => g8Request('/v1/drivers'),

  // Avanza el estado logístico (CREATED -> PICKING -> ASSIGNED -> OUT_FOR_DELIVERY).
  // No se usa para llegar a DELIVERED: eso pasa por `confirm`.
  updateStatus: (shipment, status, extra = {}) =>
    g8Request(`/v1/shipments/${shipment.shipmentId}`, {
      method: 'PATCH',
      headers: ifMatch(shipment.version),
      body: { status, ...extra }
    }),

  confirm: (shipment, proof) =>
    g8Request(`/v1/shipments/${shipment.shipmentId}/confirm`, {
      method: 'POST',
      headers: { ...ifMatch(shipment.version), 'Idempotency-Key': idempotencyKey('confirm', shipment.shipmentId) },
      body: proof ? { proof } : {}
    }),

  reject: (shipment, reason) =>
    g8Request(`/v1/shipments/${shipment.shipmentId}/reject`, {
      method: 'POST',
      headers: { ...ifMatch(shipment.version), 'Idempotency-Key': idempotencyKey('reject', shipment.shipmentId) },
      body: reason ? { reason } : {}
    }),

  reship: (shipment, reason) =>
    g8Request(`/v1/shipments/${shipment.shipmentId}/reship`, {
      method: 'POST',
      headers: { ...ifMatch(shipment.version), 'Idempotency-Key': idempotencyKey('reship', shipment.shipmentId) },
      body: reason ? { reason } : {}
    })
};
