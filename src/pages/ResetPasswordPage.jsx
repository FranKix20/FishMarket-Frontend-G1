import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isRecoveryConfigured } from '../api/supabase';
import { ApiError } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

const MIN_PASSWORD = 8;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false); // ¿ya evaluamos el enlace?
  const [ready, setReady] = useState(false); // ¿hay sesión de recuperación válida?
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Al abrir el enlace del correo, Supabase detecta el token en el hash de la URL
  // y establece una sesión temporal (evento PASSWORD_RECOVERY). Habilitamos el
  // formulario solo cuando esa sesión existe.
  useEffect(() => {
    if (!supabase) {
      setChecked(true);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
        setChecked(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(new ApiError(422, 'WEAK_PASSWORD', `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`));
      return;
    }
    setLoading(true);
    try {
      const { error: sbError } = await supabase.auth.updateUser({ password });
      if (sbError) throw new ApiError(sbError.status || 0, 'RESET_ERROR', sbError.message);
      // Cerramos la sesión temporal para que inicie sesión limpio (por el BFF).
      await supabase.auth.signOut();
      window.history.replaceState({}, '', '/restablecer-contrasena');
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'RESET_ERROR', err.message));
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card panel auth-card">
        <h1>Nueva contraseña</h1>

        {!isRecoveryConfigured ? (
          <>
            <p className="auth-card__subtitle">La recuperación no está configurada.</p>
            <p className="auth-card__switch">
              <Link to="/login">← Volver a iniciar sesión</Link>
            </p>
          </>
        ) : !checked ? (
          <p className="auth-card__subtitle">Validando enlace…</p>
        ) : !ready ? (
          <>
            <div className="banner banner-error" role="alert">
              <p>El enlace no es válido o expiró. Solicita uno nuevo.</p>
            </div>
            <p className="auth-card__switch">
              <Link to="/recuperar-contrasena">Pedir un enlace nuevo</Link>
            </p>
          </>
        ) : (
          <>
            <p className="auth-card__subtitle">Elige tu nueva contraseña.</p>
            {error && <ErrorBanner error={error} />}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="password">Nueva contraseña</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
