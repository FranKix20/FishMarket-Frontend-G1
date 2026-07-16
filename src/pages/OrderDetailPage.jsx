import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ordersApi } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import Tideline from '../components/Tideline';
import { formatCLP, formatDate, statusLabel, statusPillClass } from '../utils/format';

// Secuencia conocida de estados que expone Grupo 5. Si el pedido está
// CANCELLED u OUT_OF_STOCK se muestra un estado especial en vez del
// tracker, porque no encajan en una línea de tiempo lineal.
const FLOW = ['CREATED', 'STOCK_RESERVED', 'PAID', 'SHIPPED', 'DELIVERED'];
const FLOW_LABELS = {
  CREATED: 'Pedido creado',
  STOCK_RESERVED: 'Stock reservado',
  PAID: 'Pago aprobado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado'
};

function OrderTracker({ status }) {
  const currentIdx = FLOW.indexOf(status);
  return (
    <div className="order-tracker">
      {FLOW.map((step, idx) => {
        const isComplete = currentIdx >= 0 && idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step} className={`order-tracker__step ${isComplete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''}`}>
            <div className="order-tracker__dot">{isComplete ? '✓' : idx + 1}</div>
            <span className="order-tracker__label">{FLOW_LABELS[step]}</span>
            {isCurrent && <span className="order-tracker__sub">Actual</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await ordersApi.get(orderId);
      setOrder(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page container">
      <Link to="/pedidos" style={{ fontSize: 13 }}>
        ← Volver a mis pedidos
      </Link>

      {error && <ErrorBanner error={error} onRetry={load} />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Tideline loading />
        </div>
      ) : order ? (
        <div className="card panel" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>¡Pedido confirmado!</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13.5, marginTop: 4 }}>
                Número de pedido: <span className="mono">{order.orderNumber || order.id}</span> · {formatDate(order.createdAt)}
              </p>
            </div>
            <span className={`pill ${statusPillClass(order.status)}`}>{statusLabel(order.status)}</span>
          </div>

          {['CANCELLED', 'OUT_OF_STOCK'].includes(order.status) ? (
            <div className="banner banner-warning" style={{ marginTop: 20 }}>
              Este pedido no continúa el flujo estándar de entrega ({statusLabel(order.status).toLowerCase()}).
            </div>
          ) : (
            <OrderTracker status={order.status} />
          )}

          {order.items?.length > 0 && (
            <div className="order-detail__items">
              {order.items.map((item, idx) => (
                <div className="order-detail__item-row" key={item.id || idx}>
                  <div className="order-detail__item-info">
                    <div className="order-detail__item-thumb">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName || ''} loading="lazy" />
                      ) : (
                        <span aria-hidden="true">🎣</span>
                      )}
                    </div>
                    <span>
                      {item.productName || item.productId} × {item.quantity}
                    </span>
                  </div>
                  <span className="mono">{formatCLP(item.subtotal)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="cart-summary__row total">
            <span>Total pagado</span>
            <span>{formatCLP(order.totalAmount)}</span>
          </div>

          {(order.shippingAddress || order.paymentMethod) && (
            <div className="detail-columns">
              {order.shippingAddress && (
                <div>
                  <h4>📍 Información de despacho</h4>
                  <p>
                    {order.shippingAddress.street}
                    <br />
                    {order.shippingAddress.city}, {order.shippingAddress.region}
                    <br />
                    {order.shippingAddress.zipCode}
                  </p>
                </div>
              )}
              {order.paymentMethod && (
                <div>
                  <h4>💳 Pago</h4>
                  <p>{order.paymentMethod}</p>
                </div>
              )}
            </div>
          )}

          {order.history?.length > 0 && (
            <>
              <h4 style={{ marginTop: 32, marginBottom: 4 }}>Historial</h4>
              <div>
                {order.history.map((h, idx) => (
                  <div key={idx} className="timeline-event">
                    <span className={`pill ${statusPillClass(h.newStatus)}`}>{statusLabel(h.newStatus)}</span>
                    <span>
                      {h.reason} · {formatDate(h.changedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
