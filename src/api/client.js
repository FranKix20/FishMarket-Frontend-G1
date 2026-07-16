const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://bff-mock-g1.vercel.app';

const TOKEN_KEY = 'marea.access_token';
const REFRESH_KEY = 'marea.refresh_token';
const USER_KEY = 'marea.user';

// ---------------------------------------------------------------------
// Sesión (localStorage, según lo decidido: persiste entre recargas)
// ---------------------------------------------------------------------
export function saveSession({ access_token, refresh_token, user }) {
  if (access_token) localStorage.setItem(TOKEN_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// ---------------------------------------------------------------------
// Error estándar del ecosistema: { timestamp, status, code, message, correlationId }
// Lo envolvemos en una clase propia para poder mostrar `message` directo
// en la UI sin tener que desarmar la respuesta en cada pantalla.
// ---------------------------------------------------------------------
export class ApiError extends Error {
  constructor(status, code, message, correlationId) {
    super(message || 'Ocurrió un error inesperado.');
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

/**
 * Genera un UUID v4. Se usa para Idempotency-Key en checkout y sessionId
 * en el chat. crypto.randomUUID existe en navegadores modernos servidos
 * por HTTPS (Vercel/Netlify/Cloudflare Pages, que es donde esto corre).
 */
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback simple por si el navegador no expone crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Cliente central de llamadas al BFF. Reenvía siempre Authorization si
 * hay sesión activa (Grupo 4 lo exige en /cart y /checkout desde julio),
 * y traduce el formato de error estándar del ecosistema a ApiError.
 */
async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const token = auth ? getToken() : null;

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    throw new ApiError(0, 'NETWORK_ERROR', 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
  }

  const dataSource = response.headers.get('x-data-source');
  const isReplay = response.headers.get('x-idempotent-replay') === 'true';

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = payload?.message || `Error ${response.status}`;
    throw new ApiError(response.status, payload?.code || 'UNKNOWN_ERROR', message, payload?.correlationId);
  }

  return { data: payload, dataSource, isReplay };
}

// ---------------------------------------------------------------------
// Auth (Grupo 2)
// ---------------------------------------------------------------------
export const authApi = {
  register: (email, password, fullName) =>
    request('/api/auth/register', {
      method: 'POST',
      auth: false,
      body: { email, password, full_name: fullName }
    }),

  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password }
    }),

  session: () => request('/api/auth/session'),

  logout: () => request('/api/auth/logout', { method: 'POST' })
};

// ---------------------------------------------------------------------
// Catálogo (Grupo 3)
// ---------------------------------------------------------------------
export const productsApi = {
  list: (page = 1, size = 12) =>
    request(`/api/products?page=${page}&size=${size}`, { auth: false }),

  search: (q, page = 1, size = 12) =>
    request(`/api/products/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`, { auth: false }),

  get: (id) => request(`/api/products/${id}`, { auth: false })
};

// ---------------------------------------------------------------------
// Carrito (Grupo 4) — requiere Authorization
// ---------------------------------------------------------------------
export const cartApi = {
  // Un GET inicial es necesario para que el carrito quede inicializado
  // del lado de Grupo 4 antes del primer POST de un usuario nuevo.
  get: (userId) => request(`/api/cart/${userId}`),

  addItem: (userId, productId, quantity) =>
    request(`/api/cart/${userId}/items`, {
      method: 'POST',
      body: { productId, quantity }
    }),

  removeItem: (userId, productId) =>
    request(`/api/cart/${userId}/items/${productId}`, { method: 'DELETE' })
};

// ---------------------------------------------------------------------
// Checkout (Grupo 4/5) — requiere Authorization + Idempotency-Key
// ---------------------------------------------------------------------
export const checkoutApi = {
  submit: (userId, idempotencyKey, extra = {}) =>
    request('/api/checkout', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: { userId, ...extra }
    })
};

// ---------------------------------------------------------------------
// Pedidos (Grupo 5)
// ---------------------------------------------------------------------
export const ordersApi = {
  list: (userId, { page = 1, size = 10, status } = {}) => {
    const params = new URLSearchParams({ userId, page, size });
    if (status) params.set('status', status);
    return request(`/api/orders?${params.toString()}`);
  },

  get: (orderId) => request(`/api/orders/${orderId}`)
};

// ---------------------------------------------------------------------
// Notificaciones (Grupo 9)
// ---------------------------------------------------------------------
export const notificationsApi = {
  list: (userId, page = 1, size = 10) =>
    request(`/api/notifications?userId=${userId}&page=${page}&size=${size}`),

  markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH' })
};

// ---------------------------------------------------------------------
// Chatbot (Grupo 11)
// ---------------------------------------------------------------------
export const chatApi = {
  send: (sessionId, message, userId) =>
    request('/api/chat', {
      method: 'POST',
      body: { sessionId, message, userId: userId ?? null }
    }),

  faq: (category) => request(`/api/chat/faq/${category}`, { auth: false }),

  health: async () => {
    try {
      return await request('/api/chat/health', { auth: false });
    } catch (err) {
      // Fallback a llamada directa al Render si falla el proxy/BFF de producción
      const res = await fetch('https://chat-bot-v-xzvi.onrender.com/health');
      if (!res.ok) throw err;
      const data = await res.json();
      return { data };
    }
  }
};

