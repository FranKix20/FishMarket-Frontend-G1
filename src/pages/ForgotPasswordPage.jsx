import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isRecoveryConfigured } from '../api/supabase';
import { ApiError } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Supabase envía un correo con un enlace que vuelve a /restablecer-contrasena.
      // Por seguridad responde igual exista o no la cuenta (no revela el registro).
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/restablecer-contrasena`
      });
      if (sbError) throw new ApiError(sbError.status || 0, 'RECOVERY_ERROR', sbError.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'RECOVERY_ERROR', err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card panel auth-card">
        <h1>Recuperar contraseña</h1>
        <p className="auth-card__subtitle">Te enviaremos un enlace para restablecerla.</p>

        {!isRecoveryConfigured ? (
          <>
            <div className="banner banner-error" role="alert">
              <p>
                La recuperación no está configurada. Faltan <code>VITE_SUPABASE_URL</code> y{' '}
                <code>VITE_SUPABASE_ANON_KEY</code>.
              </p>
            </div>
            <p className="auth-card__switch">
              <Link to="/login">← Volver a iniciar sesión</Link>
            </p>
          </>
        ) : sent ? (
          <>
            <div className="banner banner-success" role="status">
              <p>
                Si <b>{email}</b> tiene una cuenta, te enviamos un correo con el enlace para
                restablecer tu contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).
              </p>
            </div>
            <p className="auth-card__switch">
              <Link to="/login">← Volver a iniciar sesión</Link>
            </p>
          </>
        ) : (
          <>
            {error && <ErrorBanner error={error} />}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Correo</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.cl"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
            <p className="auth-card__switch">
              ¿Te acordaste? <Link to="/login">Inicia sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
