import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import ErrorBanner from '../components/ErrorBanner';
import Tideline from '../components/Tideline';
import { formatCLP } from '../utils/format';

const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_COST = 3000;

export default function CartPage() {
  const { cart, loading, error, addItem, removeItem, refresh } = useCart();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);

  const items = cart?.items || [];
  const subtotal = cart?.totalAmount ?? items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const shipping = items.length === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const handleRemove = async (productId) => {
    setBusyId(productId);
    try {
      await removeItem(productId);
    } finally {
      setBusyId(null);
    }
  };

  const handleAddOne = async (productId) => {
    setBusyId(productId);
    try {
      await addItem(productId, 1);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page container">
      <div className="page-header">
        <h1>Mi carrito</h1>
        <p>Revisa lo que llevas antes de continuar al pago.</p>
      </div>

      {error && <ErrorBanner error={error} onRetry={refresh} />}

      {loading && !cart ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Tideline loading />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state__icon">🧺</div>
          <p>Tu carrito está vacío todavía.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
            Seguir comprando
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            <div className="card">
              {items.map((item) => (
                <div className="cart-item" key={item.id || item.productId}>
                  <div className="cart-item__thumb" aria-hidden="true">
                    🎣
                  </div>
                  <div className="cart-item__info">
                    <p>{item.productName || item.productId}</p>
                    <p className="qty">
                      {item.quantity} × {formatCLP(item.unitPrice)}
                    </p>
                  </div>

                  <div className="qty-stepper" style={{ flexShrink: 0 }}>
                    <button
                      type="button"
                      aria-label="Agregar una unidad más"
                      onClick={() => handleAddOne(item.productId)}
                      disabled={busyId === item.productId}
                    >
                      +
                    </button>
                    <span>{item.quantity}</span>
                  </div>

                  <span className="cart-item__price">{formatCLP(item.subtotal)}</span>

                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemove(item.productId)}
                    disabled={busyId === item.productId}
                    aria-label="Quitar del carrito"
                  >
                    {busyId === item.productId ? '…' : '🗑'}
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
              ← Seguir comprando
            </button>
          </div>

          <div className="card panel cart-summary">
            <h2>Resumen del pedido</h2>

            <div className="cart-summary__row">
              <span>Subtotal ({items.length} producto{items.length === 1 ? '' : 's'})</span>
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

            {remainingForFreeShipping > 0 ? (
              <div className="cart-summary__shipping-note">
                ¡Envío gratis por compras sobre {formatCLP(FREE_SHIPPING_THRESHOLD)}! Te faltan{' '}
                {formatCLP(remainingForFreeShipping)}.
                <div className="progress-track">
                  <div className="progress-track__fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            ) : (
              <div className="cart-summary__shipping-note">Tu pedido ya califica para envío gratis. 🎉</div>
            )}

            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ marginTop: 20 }}
              onClick={() => navigate('/checkout')}
            >
              Ir a pagar
            </button>
          </div>
        </div>
      )}

      <div className="trust-strip">
        <div className="trust-strip__item">
          <strong>Compra segura</strong>
          Tus datos protegidos
        </div>
        <div className="trust-strip__item">
          <strong>Cambios y devoluciones</strong>
          Hasta 30 días
        </div>
        <div className="trust-strip__item">
          <strong>Soporte 24/7</strong>
          ¿Necesitas ayuda?
        </div>
        <div className="trust-strip__item">
          <strong>Garantía oficial</strong>
          Productos originales
        </div>
      </div>
    </div>
  );
}
