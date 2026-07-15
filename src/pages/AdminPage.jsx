import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../api/admin';
import ErrorBanner from '../components/ErrorBanner';
import Tideline from '../components/Tideline';
import AdminUserModal from '../components/AdminUserModal';

const PAGE_SIZE = 8;

const CHIPS = [
  { key: 'todos', label: 'Todos', match: () => true },
  { key: 'activos', label: 'Activos', match: (u) => u.status === 'active' },
  { key: 'deshabilitados', label: 'Deshabilitados', match: (u) => u.status === 'disabled' },
  { key: 'admins', label: 'Admins', match: (u) => u.role === 'admin' },
  { key: 'clientes', label: 'Clientes', match: (u) => u.role === 'customer' }
];

function initials(name, email) {
  const base = (name || email || '?').trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState('todos');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listUsers({ page: 1, limit: 200 });
      setUsers(res.users || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (fn) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err);
    }
  };

  const counts = useMemo(() => {
    const c = {};
    for (const def of CHIPS) c[def.key] = users.filter(def.match).length;
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const def = CHIPS.find((x) => x.key === chip) || CHIPS[0];
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (!def.match(u)) return false;
      if (!q) return true;
      return (
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.business_user_id?.toLowerCase().includes(q)
      );
    });
  }, [users, chip, search]);

  useEffect(() => {
    setPage(1);
  }, [chip, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="container admin">
      <div className="admin-head">
        <div>
          <h1>Gestión de usuarios</h1>
          <p className="admin-sub">Administra las cuentas del marketplace.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
          + Nuevo usuario
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="admin-chips">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              className={`admin-chip ${chip === c.key ? 'is-active' : ''}`}
              onClick={() => setChip(c.key)}
            >
              {c.label} <span className="admin-chip__count">({counts[c.key] ?? 0})</span>
            </button>
          ))}
        </div>
        <input
          className="admin-search"
          placeholder="Buscar por email, nombre o ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <ErrorBanner error={error} onRetry={load} />}

      <div className="card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Registro</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Verificado</th>
              <th className="ta-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="admin-empty">
                  <Tideline loading />
                </td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan="6" className="admin-empty">
                  No hay usuarios que coincidan.
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((u) => (
                <tr key={u.user_id}>
                  <td>
                    <div className="admin-user">
                      <div className={`admin-avatar ${u.role === 'admin' ? 'is-admin' : ''}`}>
                        {initials(u.full_name, u.email)}
                      </div>
                      <div className="admin-user__info">
                        <span className="admin-user__name">{u.full_name || u.business_user_id}</span>
                        <span className="admin-user__sub">
                          {u.business_user_id ? `${u.business_user_id} · ` : ''}
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{fmtDate(u.created_at)}</td>
                  <td>
                    <span className={`admin-badge role-${u.role}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`admin-badge status-${u.status}`}>
                      {u.status === 'active' ? 'Activo' : 'Deshabilitado'}
                    </span>
                  </td>
                  <td>{u.email_verified ? <span className="admin-verified">✓</span> : <span className="admin-muted">—</span>}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal({ mode: 'edit', user: u })}>
                        Editar
                      </button>
                      {u.status === 'active' ? (
                        <button
                          className="admin-icon-btn"
                          title="Deshabilitar"
                          onClick={() => run(() => adminApi.changeStatus(u.user_id, 'disabled'))}
                        >
                          ⏸
                        </button>
                      ) : (
                        <button
                          className="admin-icon-btn"
                          title="Activar"
                          onClick={() => run(() => adminApi.changeStatus(u.user_id, 'active'))}
                        >
                          ▶
                        </button>
                      )}
                      <button
                        className="admin-icon-btn is-danger"
                        title="Eliminar"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar a ${u.email}? Es permanente.`)) {
                            run(() => adminApi.deleteUser(u.user_id));
                          }
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="admin-pager">
        <button className="btn btn-secondary btn-sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
          ← Anterior
        </button>
        <span className="admin-pager__info">
          Página {safePage} de {totalPages} · {filtered.length} usuarios
        </span>
        <button className="btn btn-secondary btn-sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
          Siguiente →
        </button>
      </div>

      {modal && (
        <AdminUserModal
          mode={modal.mode}
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
