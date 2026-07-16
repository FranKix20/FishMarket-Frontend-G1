import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentsApi } from '../api/client';
import { paymentStatusLabel, paymentStatusPillClass } from '../utils/format';

const COPY = {
  success: { title: 'Verificando tu pago…', icon: '✓' },
  failure: { title: 'Tu pago no fue aprobado', icon: '✕' },
  pending: { title: 'Tu pago está pendiente', icon: '⏳' }
};

// Mercado Pago redirige aquí según el resultado, pero nunca hay que
// confiar en A CUÁL de las 3 URLs redirigió como única fuente de
// verdad. Siempre se reconsulta el estado real contra la API (puede
// cambiar, ej. un rechazo tardío que llega recién por el webhook).
export default function PaymentReturnPage({ outcome }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('external_reference');

  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(true);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!paymentId) {
      setError('No se recibió información del pago en la URL de retorno.');
      setChecking(false);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await paymentsApi.getById(paymentId);
        if (cancelled) return;
        setPayment(data);

        attemptsRef.current += 1;
        // El webhook de MP puede tardar unos segundos: se reintenta
        // cada 2s por ~10s (5 intentos) mientras siga en PENDING.
        if (data.status === 'PENDING' && attemptsRef.current < 5) {
          setTimeout(poll, 2000);
        } else {
          setChecking(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('No se pudo consultar el estado del pago. Revisa "Mis pedidos" más tarde.');
          setChecking(false);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const copy = COPY[outcome] || COPY.pending;
  const finalStatus = payment?.status;

  let heading = copy.title;
  let icon = copy.icon;

  if (!checking && payment) {
    if (finalStatus === 'APPROVED') {
      heading = '¡Pago aprobado!';
      icon = '✓';
    } else if (finalStatus === 'REJECTED') {
      heading = 'Tu pago fue rechazado';
      icon = '✕';
    } else {
      heading = 'Tu pago sigue pendiente';
      icon = '⏳';
    }
  }

  return (
    <div className="page container">
      <div className="card confirmation-card">
        <div className="confirmation-card__icon">{checking ? '…' : icon}</div>
        <h1>{checking ? 'Verificando tu pago…' : heading}</h1>

        {error && (
          <p style={{ color: 'var(--color-danger, #c0392b)', marginTop: 12 }}>{error}</p>
        )}

        {payment && (
          <>
            <p style={{ marginTop: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Estado del pago:</span>
              <span className={`pill ${paymentStatusPillClass(payment.status)}`}>
                {paymentStatusLabel(payment.status)}
              </span>
            </p>
            {payment.orderId && (
              <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
                Pedido: <span className="mono">{payment.orderId}</span>
              </p>
            )}
          </>
        )}

        {!checking && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            {payment?.orderId && (
              <button className="btn btn-secondary" onClick={() => navigate(`/pedidos/${payment.orderId}`)}>
                Ver mi pedido
              </button>
            )}
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
