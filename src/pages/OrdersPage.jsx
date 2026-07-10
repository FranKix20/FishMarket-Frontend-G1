import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';
import Pagination from '../components/Pagination';
import Tideline from '../components/Tideline';
import { formatCLP, formatDate, statusLabel, statusPillClass } from '../utils/format';

const STATUS_FILTERS = [
  { value: null, label: 'Todos' },
  { value: 'CREATED', label: 'Creado' },
  { value: 'STOCK_RESERVED', label: 'Stock reservado' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CANCELLED', label: 'Cancelado' }
];

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (currentPage, currentStatus) => {
      if (!user?.business_user_id) return;
      setLoading(true);
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
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    load(page, status);
  }, [page, status, load]);

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
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Tideline loading />
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state__icon">📦</div>
          <p>Todavía no hay pedidos en este filtro.</p>
        </div>
      ) : (
        <>
          <div className="orders-list">
            {orders.map((order) => (
              <Link to={`/pedidos/${order.id}`} key={order.id} className="card order-row">
                <div>
                  <p className="order-row__id">{order.orderNumber || order.id}</p>
                  <p className="order-row__date">{formatDate(order.createdAt)}</p>
                </div>
                <span className={`pill ${statusPillClass(order.status)}`}>{statusLabel(order.status)}</span>
                <span className="order-row__total">{formatCLP(order.totalAmount)}</span>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
