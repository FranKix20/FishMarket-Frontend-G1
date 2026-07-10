import { useCallback, useEffect, useState } from 'react';
import { notificationsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';
import Pagination from '../components/Pagination';
import Tideline from '../components/Tideline';
import { formatDate } from '../utils/format';

const TYPE_ICON = {
  ORDER_STATUS: '📦',
  PROMOTION: '🏷️',
  SHIPPING: '🚚',
  PAYMENT: '💳'
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingId, setMarkingId] = useState(null);

  const load = useCallback(
    async (currentPage) => {
      if (!user?.business_user_id) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await notificationsApi.list(user.business_user_id, currentPage, 10);
        setNotifications(data?.data || []);
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
    load(page);
  }, [page, load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id) => {
    setMarkingId(id);
    try {
      await notificationsApi.markRead(id);
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      setError(err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      // eslint-disable-next-line no-await-in-loop
      await handleMarkRead(n.id);
    }
  };

  return (
    <div className="page container">
      <div className="page-header">
        <h1>Notificaciones</h1>
        <p>Actualizaciones sobre tus pedidos y tu cuenta.</p>
      </div>

      {error && <ErrorBanner error={error} onRetry={() => load(page)} />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Tideline loading />
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state__icon">🔔</div>
          <p>No tienes notificaciones todavía.</p>
        </div>
      ) : (
        <>
          <div className="card notif-header">
            <div className="notif-header__icon">🔔</div>
            <div className="notif-header__text">
              <p>{unreadCount > 0 ? `Tienes ${unreadCount} notificación${unreadCount === 1 ? '' : 'es'} nueva${unreadCount === 1 ? '' : 's'}` : 'Estás al día'}</p>
              <p>Revisa tus últimas actualizaciones y eventos de tu cuenta.</p>
            </div>
            {unreadCount > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.map((n) => (
              <div className={`card notif-row ${!n.read ? 'is-unread' : ''}`} key={n.id}>
                <div className="notif-row__icon">{TYPE_ICON[n.type] || '🔔'}</div>
                <div className="notif-row__body">
                  <p>{n.title}</p>
                  <p>{n.message}</p>
                </div>
                <div className="notif-row__meta">
                  <span className="notif-row__time">{formatDate(n.createdAt)}</span>
                  {!n.read ? (
                    <button
                      type="button"
                      className="notif-dot"
                      style={{ border: 'none', cursor: 'pointer' }}
                      aria-label="Marcar como leída"
                      title="Marcar como leída"
                      onClick={() => handleMarkRead(n.id)}
                      disabled={markingId === n.id}
                    />
                  ) : (
                    <span style={{ width: 9, height: 9 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
