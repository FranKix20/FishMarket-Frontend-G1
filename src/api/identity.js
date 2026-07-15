/**
 * Cliente directo al servicio de Identidad (Grupo 2) para operaciones de PERFIL
 * que el BFF no expone: ver/editar el perfil propio y cambiar la contraseña.
 *
 * Reutiliza el token que ya guarda el BFF al hacer login (es un JWT de G2 válido,
 * verificado) y el mismo `ApiError` del ecosistema, para que `ErrorBanner` lo
 * muestre igual que el resto de la app. G2 tiene CORS abierto, así que se puede
 * llamar directo desde el navegador.
 */
import { getToken, ApiError } from './client';

const IDENTITY_URL = (
  import.meta.env.VITE_IDENTITY_URL || 'https://auth-minimarket-cloud.onrender.com'
).replace(/\/$/, '');

export async function g2Request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Tu sesión no está activa. Inicia sesión de nuevo.');
  }

  let response;
  try {
    response = await fetch(`${IDENTITY_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No pudimos conectar con el servicio de identidad. Revisa tu conexión e intenta de nuevo.'
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

export const identityApi = {
  // Perfil propio (Grupo 2)
  me: () => g2Request('/users/me'),

  updateName: (fullName) => g2Request('/users/me', { method: 'PATCH', body: { full_name: fullName } }),

  changePassword: (currentPassword, newPassword) =>
    g2Request('/auth/change-password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword }
    })
};
