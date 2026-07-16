import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';
import Tideline from '../components/Tideline';
import ProductCard from '../components/ProductCard';
import { productsApi } from '../api/client';
import { formatCLP } from '../utils/format';

const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_COST = 3000;
const REMOVE_ANIM_MS = 260;

export default function CartPage() {
  const { cart, loading, error, addItem, removeItem, refresh } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);
  const [itemErrors, setItemErrors] = useState({});
  const [removingId, setRemovingId] = useState(null);
  const [bumpId, setBumpId] = useState(null);
  const [recommended, setRecommended] = useState([]);

  const items = cart?.items || [];
  const subtotal = cart?.totalAmount ?? items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const shipping = items.length === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Se muestra la tarjeta "colapsándose" (fade + altura a 0) durante
  // REMOVE_ANIM_MS antes de sacarla de verdad del carrito, para que la
  // salida se sienta intencional y no un salto brusco de contenido.
  const handleRemove = async (productId) => {
    setRemovingId(productId);
    setBusyId(productId);
    setTimeout(async () => {
      try {
        await removeItem(productId);
      } finally {
        setBusyId(null);
        setRemovingId(null);
      }
    }, REMOVE_ANIM_MS);
  };

  const handleAddOne = async (productId) => {
    setBusyId(productId);
    setItemErrors((prev) => ({ ...prev, [productId]: null }));
    try {
      await addItem(productId, 1);
      setBumpId(productId);
      setTimeout(() => setBumpId(null), 260);
    } catch (err) {
      setItemErrors((prev) => ({
        ...prev,
        [productId]: err?.message || 'No se pudo agregar más unidades.'
      }));
    } finally {
      setBusyId(null);
    }
  };

  const handleAddRecommended = async (productId, quantity) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await addItem(productId, quantity);
  };

  // Recomendaciones simples: se toma la primera página del catálogo y se
  // excluyen los productos que ya están en el carrito, para que la
  // página no se sienta vacía cuando llevas solo 1-2 productos.
  useEffect(() => {
    let cancelled = false;
    productsApi
      .list(1, 8)
      .then(({ data }) => {
        if (cancelled) return;
        const cartIds = new Set(items.map((it) => it.productId));
        setRecommended((data?.data || []).filter((p) => !cartIds.has(p.id)).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setRecommended([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.items?.length]);

  return (
    <div className={`page container${items.length > 0 ? ' page--has-mobile-bar' : ''}`}>
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
                <div
                  className={`cart-item${removingId === item.productId ? ' cart-item--removing' : ''}`}
                  key={item.id || item.productId}
                >
                  <div className="cart-item__main">
                    <div className="cart-item__thumb">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName || ''} loading="lazy" />
                      ) : (
                        <span aria-hidden="true">🎣</span>
                      )}
                    </div>
                    <div className="cart-item__info">
                      <p>{item.productName || item.productId}</p>
                      <p className="qty">
                        {item.quantity} × {formatCLP(item.unitPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="cart-item__controls">
                    <div className="qty-stepper" style={{ flexShrink: 0 }}>
                      <button
                        type="button"
                        aria-label="Agregar una unidad más"
                        onClick={() => handleAddOne(item.productId)}
                        disabled={
                          busyId === item.productId ||
                          (typeof item.stockAvailable === 'number' && item.quantity >= item.stockAvailable)
                        }
                      >
                        +
                      </button>
                      <span className={bumpId === item.productId ? 'qty-bump' : ''}>{item.quantity}</span>
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
                  {typeof item.stockAvailable === 'number' && item.quantity >= item.stockAvailable && (
                    <p className="cart-item__stock-hint">Llegaste al máximo disponible ({item.stockAvailable}).</p>
                  )}
                  {itemErrors[item.productId] && (
                    <p className="cart-item__error" role="alert">
                      {itemErrors[item.productId]}
                    </p>
                  )}
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

          {/* Barra fija inferior en mobile: total + "Ir a pagar" quedan
              siempre visibles sin depender del scroll (se oculta sola en
              desktop vía CSS). */}
          <div className="cart-summary__mobile-bar">
            <div>
              <span>Total</span>
              <strong>{formatCLP(total)}</strong>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/checkout')}>
              Ir a pagar
            </button>
          </div>
        </div>
      )}

      {!loading && items.length > 0 && recommended.length > 0 && (
        <div className="cart-recommend">
          <h2>También te puede interesar</h2>
          <div className="product-grid">
            {recommended.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={handleAddRecommended} />
            ))}
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
