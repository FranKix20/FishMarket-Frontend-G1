import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { checkoutApi, uuid } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import { formatCLP } from '../utils/format';

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Tarjeta de crédito (simulada)' },
  { value: 'debit_card', label: 'Tarjeta de débito (simulada)' },
  { value: 'bank_transfer', label: 'Transferencia bancaria (simulada)' }
];

const SHIPPING_COST = 3000;
const FREE_SHIPPING_THRESHOLD = 50000;

function Stepper({ step }) {
  const steps = ['Carrito', 'Entrega y pago', 'Confirmación'];
  return (
    <div className="checkout-stepper">
      {steps.map((label, idx) => {
        const n = idx + 1;
        const state = n < step ? 'is-done' : n === step ? 'is-active' : '';
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`checkout-stepper__step ${state}`}>
              <div className="checkout-stepper__circle">{n < step ? '✓' : n}</div>
              <span>{label}</span>
            </div>
            {n < steps.length && <div className={`checkout-stepper__line ${n < step ? 'is-done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const items = cart?.items || [];
  const subtotal = cart?.totalAmount ?? items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || items.length === 0 ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;

  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [address, setAddress] = useState({ street: '', city: '', region: '', country: 'CL', zipCode: '' });
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuid());
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    if (items.length === 0 && !confirmedOrder) {
      navigate('/carro', { replace: true });
    }
  }, [items.length, confirmedOrder, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const addressComplete = address.street && address.city && address.region && address.zipCode;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const { data } = await checkoutApi.submit(user.business_user_id, idempotencyKey, {
        paymentMethod,
        shippingAddress: address
      });
      setConfirmedOrder(data);
      setIdempotencyKey(uuid());
      refresh();
    } catch (err) {
      setCheckoutError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="page container">
        <Stepper step={3} />
        <div className="card confirmation-card">
          <div className="confirmation-card__icon">✓</div>
          <h1>¡Pedido confirmado!</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
            Tu pedido <span className="mono">{confirmedOrder.orderId}</span> ha sido creado exitosamente. Te
            enviaremos una notificación cuando haya cambios en su estado.
          </p>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', marginTop: 20 }}>
            {formatCLP(confirmedOrder.totalAmount)}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/pedidos')}>
              Ver mis pedidos
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Seguir comprando
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page container">
      <Stepper step={2} />

      <div className="checkout-layout">
        <form onSubmit={handleSubmit}>
          {checkoutError && <ErrorBanner error={checkoutError} />}

          <div className="card panel" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>📍 Dirección de entrega</h2>
            <div className="field">
              <label htmlFor="street">Dirección</label>
              <input
                id="street"
                required
                value={address.street}
                onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                placeholder="Av. Siempre Viva 1234, Depto 56"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="city">Ciudad</label>
                <input
                  id="city"
                  required
                  value={address.city}
                  onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                  placeholder="Valparaíso"
                />
              </div>
              <div className="field">
                <label htmlFor="region">Región</label>
                <input
                  id="region"
                  required
                  value={address.region}
                  onChange={(e) => setAddress((a) => ({ ...a, region: e.target.value }))}
                  placeholder="Región de Valparaíso"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="zipCode">Código postal</label>
              <input
                id="zipCode"
                required
                value={address.zipCode}
                onChange={(e) => setAddress((a) => ({ ...a, zipCode: e.target.value }))}
                placeholder="2340000"
              />
            </div>
          </div>

          <div className="card panel">
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>💳 Método de pago (simulado)</h2>
            {PAYMENT_METHODS.map((m) => (
              <label key={m.value} className={`payment-option ${paymentMethod === m.value ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m.value}
                  checked={paymentMethod === m.value}
                  onChange={() => setPaymentMethod(m.value)}
                />
                <span className="payment-option__label">{m.label}</span>
              </label>
            ))}
            <p style={{ fontSize: 12.5, color: 'var(--color-text-faint)', marginTop: 8 }}>
              🔒 Este es un pago simulado para fines del proyecto — no se realiza ningún cobro real.
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: 20 }}
            disabled={!addressComplete || submitting || items.length === 0}
          >
            {submitting ? 'Confirmando pedido…' : `Confirmar compra · ${formatCLP(total)}`}
          </button>
        </form>

        <div className="card panel cart-summary">
          <h2>Resumen del pedido</h2>
          {items.map((item) => (
            <div className="order-summary-item" key={item.id || item.productId}>
              <div className="order-summary-item__thumb" aria-hidden="true">
                🎣
              </div>
              <div className="order-summary-item__info">
                <p>{item.productName || item.productId}</p>
                <p>Cantidad: {item.quantity}</p>
              </div>
              <span className="order-summary-item__price">{formatCLP(item.subtotal)}</span>
            </div>
          ))}
          <div className="cart-summary__row" style={{ marginTop: 12 }}>
            <span>Subtotal</span>
            <span>{formatCLP(subtotal)}</span>
          </div>
          <div className="cart-summary__row">
            <span>Envío</span>
            <span>{shipping === 0 ? 'Gratis' : formatCLP(shipping)}</span>
          </div>
          <div className="cart-summary__row total">
            <span>Total</span>
            <span>{formatCLP(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
