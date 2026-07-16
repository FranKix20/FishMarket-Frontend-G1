import { useEffect, useState } from 'react';
import { reportsApi } from '../../api/client';
import ErrorBanner from '../../components/ErrorBanner';
import Tideline from '../../components/Tideline';
import { formatCLP } from '../../utils/format';

const STATUS_LABELS = {
  delivered: 'Entregado',
  processing: 'Procesando',
  shipped: 'Enviado',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
  returned: 'Devuelto'
};

const PAYMENT_LABELS = {
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  bank_transfer: 'Transferencia bancaria',
  paypal: 'PayPal'
};

function pct(n) {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export default function AdminReports() {
  const [sales, setSales] = useState(null);
  const [products, setProducts] = useState(null);
  const [status, setStatus] = useState(null);
  const [fulfillment, setFulfillment] = useState(null);
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, productsRes, statusRes, fulfillmentRes, paymentsRes] = await Promise.all([
        reportsApi.salesSummary({ groupBy: 'day' }),
        reportsApi.products({ limit: 5 }),
        reportsApi.status(),
        reportsApi.fulfillment(),
        reportsApi.paymentSummary()
      ]);
      setSales(salesRes.data);
      setProducts(productsRes.data);
      setStatus(statusRes.data);
      setFulfillment(fulfillmentRes.data);
      setPayments(paymentsRes.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Reportería</h1>
          <p className="admin-sub">
            Métricas y reportes del marketplace — servicio de Reportería (Grupo 10).
            {sales?.period && (
              <> Período: {sales.period.startDate} → {sales.period.endDate}.</>
            )}
          </p>
        </div>
      </div>

      {error && <ErrorBanner error={error} onRetry={load} />}

      {loading ? (
        <div className="card admin-empty">
          <Tideline loading />
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-card__label">Ingresos totales</span>
              <span className="stat-card__value">{formatCLP(sales?.summary?.totalRevenue || 0)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Pedidos</span>
              <span className="stat-card__value">{sales?.summary?.totalOrders ?? '—'}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Ticket promedio</span>
              <span className="stat-card__value">{formatCLP(sales?.summary?.averageOrderValue || 0)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Entrega a tiempo</span>
              <span className="stat-card__value">{pct(fulfillment?.metrics?.onTimeDeliveryRate)}</span>
            </div>
          </div>

          <div className="admin-report-grid">
            <div className="card admin-report-panel">
              <h2 className="admin-report-panel__title">Pedidos por estado</h2>
              {status?.statusBreakdown?.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Cantidad</th>
                      <th className="ta-right">% del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.statusBreakdown.map((s) => (
                      <tr key={s.status}>
                        <td>
                          <span className={`admin-badge ship-status-${s.status === 'delivered' ? 'delivered' : s.status === 'cancelled' || s.status === 'returned' ? 'failed' : 'picking'}`}>
                            {STATUS_LABELS[s.status] || s.status}
                          </span>
                        </td>
                        <td>{s.count}</td>
                        <td className="ta-right">{s.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <p className="admin-muted">Sin datos.</p>
              )}
            </div>

            <div className="card admin-report-panel">
              <h2 className="admin-report-panel__title">Productos más vendidos</h2>
              {products?.topProducts?.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Unidades</th>
                      <th className="ta-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.topProducts.map((p) => (
                      <tr key={p.productId}>
                        <td>
                          <div className="admin-user__info">
                            <span className="admin-user__name">{p.name}</span>
                            <span className="admin-user__sub">{p.category}</span>
                          </div>
                        </td>
                        <td>{p.unitsSold}</td>
                        <td className="ta-right">{formatCLP(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <p className="admin-muted">Sin datos.</p>
              )}
            </div>

            <div className="card admin-report-panel">
              <h2 className="admin-report-panel__title">Envíos por región</h2>
              {fulfillment?.byRegion?.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Región</th>
                      <th>Envíos</th>
                      <th className="ta-right">A tiempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fulfillment.byRegion.map((r) => (
                      <tr key={r.region}>
                        <td>{r.region}</td>
                        <td>{r.shipments}</td>
                        <td className="ta-right">{pct(r.onTimeRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <p className="admin-muted">Sin datos.</p>
              )}
            </div>

            <div className="card admin-report-panel">
              <h2 className="admin-report-panel__title">Métodos de pago</h2>
              {payments?.byMethod?.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th>Transacciones</th>
                      <th className="ta-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.byMethod.map((m) => (
                      <tr key={m.method}>
                        <td>{PAYMENT_LABELS[m.method] || m.method}</td>
                        <td>{m.count}</td>
                        <td className="ta-right">{formatCLP(m.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <p className="admin-muted">Sin datos.</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
