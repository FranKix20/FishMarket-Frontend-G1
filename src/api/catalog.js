/**
 * Cliente directo al servicio de CATÁLOGO (Grupo 3) para las operaciones de
 * administración (crear/editar productos y categorías) que el BFF todavía no expone.
 */
import { ApiError, uuid } from './client';

const CATALOG_URL = (
  import.meta.env.VITE_CATALOG_URL || 'https://catalog-api-cm1l.onrender.com/api/v1'
).replace(/\/$/, '');

function buildHeaders(isMutation = false) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-Id': uuid(),
    'X-Correlation-Id': uuid(),
    'X-Consumer': 'fishmarket-frontend-g1'
  };
  if (isMutation) headers['Idempotency-Key'] = uuid();
  return headers;
}

async function g3Request(path, { method = 'GET', body, isMutation = false } = {}) {
  let response;
  try {
    response = await fetch(`${CATALOG_URL}${path}`, {
      method,
      headers: buildHeaders(isMutation),
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No pudimos conectar con el servicio de catálogo. Revisa tu conexión e intenta de nuevo.'
    );
  }

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
    throw new ApiError(
      response.status,
      payload?.code || 'UNKNOWN_ERROR',
      payload?.message || `Error ${response.status}`,
      payload?.correlationId
    );
  }

  return payload;
}

export const catalogApi = {
  listProducts: ({ page = 1, size = 20, includeInactive = true } = {}) =>
    g3Request(`/products?page=${page}&size=${size}&includeInactive=${includeInactive}`),

  searchProducts: (q, { page = 1, size = 20 } = {}) =>
    g3Request(`/products/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`),

  getProduct: (id) => g3Request(`/products/${id}`),

  // G3 SIEMPRE crea el producto con stock_visible: 0, sin importar qué se
  // le mande en el body — su POST /products lo hardcodea así (lo confirmé
  // en su código fuente). Su propio PUT /products/:id sí acepta y persiste
  // stockVisible directamente, así que si se pide un stock inicial > 0,
  // se hace un segundo llamado inmediatamente después de crear para
  // dejarlo con el valor real, en vez de que quede en 0 hasta la próxima
  // sincronización de Grupo 7 (Inventario).
  createProduct: async ({ name, description, price, categoryId, imageUrl, stockVisible }) => {
    const created = await g3Request('/products', {
      method: 'POST',
      isMutation: true,
      body: {
        name,
        description: description || '',
        price,
        categoryId,
        imageUrl
      }
    });

    const initialStock = Number(stockVisible);
    if (Number.isFinite(initialStock) && initialStock > 0) {
      return g3Request(`/products/${created.id}`, {
        method: 'PUT',
        isMutation: true,
        body: { stockVisible: initialStock }
      });
    }
    return created;
  },

  updateProduct: (id, { name, description, price, categoryId, imageUrl, isActive, stockVisible }) =>
    g3Request(`/products/${id}`, {
      method: 'PUT',
      isMutation: true,
      body: { name, description, price, categoryId, imageUrl, isActive, stockVisible }
    }),

  setActive: (product, isActive) =>
    g3Request(`/products/${product.id}`, {
      method: 'PUT',
      isMutation: true,
      body: {
        name: product.name,
        description: product.description,
        price: product.price,
        isActive
      }
    }),

  listCategories: () => g3Request('/categories'),

  createCategory: ({ name, description }) =>
    g3Request('/categories', {
      method: 'POST',
      isMutation: true,
      body: { name, description: description || '' }
    })
};
