import { useState } from 'react';
import { adminApi } from '../api/admin';
import ErrorBanner from './ErrorBanner';

/**
 * Modal para crear o editar un usuario (panel de admin).
 * - Crear: POST /auth/register (nace customer); si se elige admin, se ajusta con
 *   PATCH /users/:id/role.
 * - Editar: PATCH /users/:id (nombre) + PATCH /users/:id/role si cambió el rol.
 */
export default function AdminUserModal({ mode, user, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'customer');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isEdit) {
        if (fullName.trim() && fullName.trim() !== user.full_name) {
          await adminApi.updateName(user.user_id, fullName.trim());
        }
        if (role !== user.role) await adminApi.changeRole(user.user_id, role);
      } else {
        const res = await adminApi.createUser({ email, password, full_name: fullName });
        if (role === 'admin') await adminApi.changeRole(res.user.user_id, 'admin');
      }
      onSaved();
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="card admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>

        {error && <ErrorBanner error={error} />}

        <div className="field">
          <label htmlFor="am-email">Correo</label>
          <input
            id="am-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isEdit}
            placeholder="tu@correo.cl"
          />
        </div>

        <div className="field">
          <label htmlFor="am-name">Nombre completo</label>
          <input id="am-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>

        {!isEdit && (
          <div className="field">
            <label htmlFor="am-pass">Contraseña</label>
            <input
              id="am-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              placeholder="Mínimo 8 caracteres"
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="am-role">Rol</label>
          <select id="am-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="customer">customer</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div className="admin-modal__actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
