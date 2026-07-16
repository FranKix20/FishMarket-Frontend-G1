import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { identityApi } from '../api/identity';
import { ApiError } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import Tideline from '../components/Tideline';

const MIN_PASSWORD = 8;

const STATUS_LABEL = { active: 'Activa', disabled: 'Deshabilitada' };
const ROLE_LABEL = { admin: 'Administrador', customer: 'Cliente' };
const ROLE_PILL = { admin: 'pill-warning', customer: 'pill-link' };

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export default function AccountPage() {
  const { updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Editar nombre
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [nameOk, setNameOk] = useState(false);

  // Cambiar contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await identityApi.me();
      setProfile(data);
      setFullName(data.full_name || '');
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveName = async (e) => {
    e.preventDefault();
    setNameError(null);
    setNameOk(false);
    const name = fullName.trim();
    if (!name || name === profile.full_name) return;
    setSavingName(true);
    try {
      const updated = await identityApi.updateName(name);
      setProfile(updated);
      // Sincroniza el nombre que muestra el navbar (cubre ambas convenciones).
      updateUser({ full_name: updated.full_name, fullName: updated.full_name });
      setNameOk(true);
    } catch (err) {
      setNameError(err);
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < MIN_PASSWORD) {
      setPwError(new ApiError(422, 'WEAK_PASSWORD', `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`));
      return;
    }
    setChangingPw(true);
    try {
      await identityApi.changePassword(currentPassword, newPassword);
      // Cambiar la contraseña revoca las sesiones en G2: cerramos y re-logueamos.
      await logout();
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch (err) {
      setPwError(err);
      setChangingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 96, textAlign: 'center' }}>
        <Tideline loading />
        <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Cargando tu cuenta…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container" style={{ paddingTop: 96, maxWidth: 720 }}>
        <ErrorBanner error={loadError} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="page container" style={{ maxWidth: 1080 }}>
      <div className="page-header">
        <h1>Mi cuenta</h1>
        <p>Gestiona los datos de tu perfil.</p>
      </div>

      <div className="account-layout">
        <div className="card account-sidebar">
          <div className="account-avatar">{initials(profile.full_name)}</div>
          <div>
            <h2 className="account-sidebar__name">{profile.full_name || '—'}</h2>
            <p className="account-sidebar__email">{profile.email}</p>
            <div className="account-sidebar__badges">
              <span className={`pill ${ROLE_PILL[profile.role] || 'pill-neutral'}`}>
                {ROLE_LABEL[profile.role] || profile.role}
              </span>
              <span className={`pill ${profile.status === 'active' ? 'pill-success' : 'pill-danger'}`}>
                {STATUS_LABEL[profile.status] || profile.status}
              </span>
            </div>
          </div>
        </div>

        <div className="account-main">
          {/* Datos del perfil */}
          <div className="card panel">
            <h2 style={{ fontSize: 17, marginBottom: 'var(--space-4)' }}>Datos de la cuenta</h2>
            <dl className="account-data-grid">
              {[
                ['ID de cliente', profile.business_user_id || '—'],
                ['Correo verificado', profile.email_verified ? 'Sí ✓' : 'No']
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Editar nombre */}
          <div className="card panel">
            <h2 style={{ fontSize: 17, marginBottom: 'var(--space-4)' }}>Editar perfil</h2>
            {nameError && <ErrorBanner error={nameError} />}
            {nameOk && (
              <div className="banner banner-success" role="status">
                <p>Nombre actualizado.</p>
              </div>
            )}
            <form onSubmit={handleSaveName}>
              <div className="field">
                <label htmlFor="fullName">Nombre completo</label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setNameOk(false);
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingName || !fullName.trim() || fullName.trim() === profile.full_name}
              >
                {savingName ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </div>

          {/* Cambiar contraseña */}
          <div className="card panel">
            <h2 style={{ fontSize: 17, marginBottom: 'var(--space-4)' }}>Cambiar contraseña</h2>
            {pwError && <ErrorBanner error={pwError} />}
            <form onSubmit={handleChangePassword}>
              <div className="field">
                <label htmlFor="currentPassword">Contraseña actual</label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="newPassword">Nueva contraseña</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={changingPw}>
                {changingPw ? 'Cambiando…' : 'Cambiar contraseña'}
              </button>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 'var(--space-3)' }}>
                Por seguridad, al cambiarla se cerrará la sesión y deberás iniciar sesión de nuevo.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
