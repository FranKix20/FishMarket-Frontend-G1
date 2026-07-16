/**
 * Cliente de ADMINISTRACIÓN de usuarios (Grupo 2), directo contra G2. Requiere
 * un token con rol `admin` (los endpoints de G2 lo validan). Reutiliza el mismo
 * helper y ApiError que `identity.js`.
 */
import { g2Request } from './identity';

export const adminApi = {
  listUsers: ({ role, status, page = 1, limit = 100 } = {}) => {
    const qs = new URLSearchParams();
    if (role) qs.set('role', role);
    if (status) qs.set('status', status);
    qs.set('page', String(page));
    qs.set('limit', String(limit));
    return g2Request(`/users?${qs.toString()}`);
  },

  // Crear pasa por /auth/register (nace como customer). Si se pide admin, se
  // ajusta el rol después con changeRole.
  createUser: ({ email, password, full_name }) =>
    g2Request('/auth/register', { method: 'POST', body: { email, password, full_name } }),

  updateName: (userId, fullName) =>
    g2Request(`/users/${userId}`, { method: 'PATCH', body: { full_name: fullName } }),

  changeRole: (userId, role) =>
    g2Request(`/users/${userId}/role`, { method: 'PATCH', body: { role } }),

  changeStatus: (userId, status) =>
    g2Request(`/users/${userId}/status`, { method: 'PATCH', body: { status } }),

  deleteUser: (userId) => g2Request(`/users/${userId}`, { method: 'DELETE' })
};
