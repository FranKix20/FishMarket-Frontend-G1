import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';
import Pagination from '../components/Pagination';
import Tideline from '../components/Tideline';
import {
  formatCLP,
  formatRelativeDate,
  statusLabel,
  statusPillClass,
  ORDER_FLOW,
  orderFlowIndex,
  isTerminalOrderStatus
} from '../utils/format';

const STATUS_FILTERS = [
  { value: null, label: 'Todos' },
  { value: 'CREATED', label: 'Creado' },
  { value: 'STOCK_RESERVED', label: 'Stock reservado' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CANCELLED', label: 'Cancelado' }
];

const REFRESH_MS = 20000;

function MiniProgress({ status }) {
  if (['CANCELLED', 'OUT_OF_STOCK'].includes(status)) return null;
  const idx = orderFlowIndex(status);
  return (
    <div className="order-row__progress" aria-hidden="true">
      {ORDER_FLOW.map((step, i) => (
        <span key={step} className={`order-row__dot ${i <= idx ? 'is-done' : ''}`} />
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(
    async (currentPage, currentStatus, { silent = false } = {}) => {
      if (!user?.business_user_id) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const { data } = await ordersApi.list(user.business_user_id, {
          page: currentPage,
          size: 10,
          status: currentStatus
        });
        setOrders(data?.data || []);
        setTotalPages(data?.pagination?.totalPages || 1);
      } catch (err) {
        if (!silent) setError(err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    load(page, status);
  }, [page, status, load]);

  // Auto-actualiza en segundo plano (sin spinner) mientras haya pedidos
  // que todavía puedan cambiar de estado, para que la lista siempre
  // refleje lo que realmente reporta G5, sin necesidad de recargar.
  useEffect(() => {
    clearInterval(intervalRef.current);
    const hasActiveOrders = orders.some((o) => !isTerminalOrderStatus(o.status));
    if (hasActiveOrders) {
      intervalRef.current = setInterval(() => {
        load(page, status, { silent: true });
      }, REFRESH_MS);
    }
    return () => clearInterval(intervalRef.current);
  }, [orders, page, status, load]);

  return (
    <div className="page container">
      <div className="page-header">
        <h1>Mis pedidos</h1>
        <p>Historial y estado de tus compras.</p>
      </div>

      <div className="status-filter">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={status === f.value ? 'is-active' : ''}
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner error={error} onRetry={() => load(page, status)} />}

      {loading ? (
        <div className="orders-list">
          {[1, 2, 3].map((i) => (
            <div className="card order-row order-row--skeleton" key={i}>
              <div className="skeleton" style={{ width: 140, height: 16, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 90, height: 14 }} />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state card anim-pop">
          <div className="empty-state__icon anim-float">📦</div>
          <p>Todavía no hay pedidos en este filtro.</p>
        </div>
      ) : (
        <>
          <div className="orders-list">
            {orders.map((order, i) => (
              <Link
                to={`/pedidos/${order.id}`}
                key={order.id}
                className="card order-row"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div className="order-row__main">
                  <p className="order-row__id">{order.orderNumber || order.id}</p>
                  <p className="order-row__date">{formatRelativeDate(order.createdAt)}</p>
                </div>
                <MiniProgress status={order.status} />
                <span className={`pill ${statusPillClass(order.status)}`}>{statusLabel(order.status)}</span>
                <span className="order-row__total">{formatCLP(order.totalAmount)}</span>
                <span className="order-row__arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
