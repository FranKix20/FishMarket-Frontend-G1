/**
 * Muestra un ApiError (status, code, message, correlationId) en un
 * banner consistente en toda la app. El correlationId queda visible
 * para poder cruzarlo con los logs del BFF si hace falta soporte.
 */
export default function ErrorBanner({ error, onRetry }) {
  if (!error) return null;

  const message = error.message || 'Ocurrió un error inesperado.';

  return (
    <div className="banner banner-error" role="alert">
      <div style={{ flex: 1 }}>
        <p>{message}</p>
        {(error.code || error.correlationId) && (
          <p style={{ marginTop: 4, opacity: 0.75 }}>
            {error.code && <code>{error.code}</code>}
            {error.code && error.correlationId && ' · '}
            {error.correlationId && <code>ref: {error.correlationId}</code>}
          </p>
        )}
      </div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry} type="button">
          Reintentar
        </button>
      )}
    </div>
  );
}
