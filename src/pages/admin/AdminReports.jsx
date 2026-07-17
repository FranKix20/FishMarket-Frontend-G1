import { useEffect, useState } from 'react';

import { reportsApi, inventoryApi } from '../../api/client';
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

const COMM_LABELS = {
  email: 'Correo',
  sms: 'SMS',
  push: 'Push',
  whatsapp: 'WhatsApp'
};

const URGENCY_LABELS = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio'
};

function pct(n) {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

// Variación con signo (+/-) para la tasa de crecimiento entre la primera
// y segunda mitad del período — viene calculada de verdad por G10 a
// partir de sus propias filas, no es un dato decorativo.
function signedPct(n) {
  if (n === null || n === undefined) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

// Gráfico de barras liviano, sin dependencias externas (mismo criterio
// que ya usa el propio panel de G10 con sus TrendChart/StackedBar: SVG
// a mano en vez de sumar una librería de charts solo para esto).
function RevenueTrendChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="admin-muted">Sin datos para el rango seleccionado.</p>;
  }
  const W = 600;
  const H = 160;
  const padL = 8;
  const padR = 8;
  const padB = 20;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const barGap = 4;
  const barW = (W - padL - padR) / data.length - barGap;

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-chart__svg" preserveAspectRatio="none">
        {data.map((d, i) => {
          const barH = Math.max(2, (d.revenue / max) * (H - padB));
          const x = padL + i * (barW + barGap);
          const y = H - padB - barH;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={2}
              className="trend-chart__bar"
              style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
            >
              <title>
                {d.date}: {formatCLP(d.revenue)} · {d.orders} pedido{d.orders === 1 ? '' : 's'}
              </title>
            </rect>
          );
        })}
      </svg>
      <div className="trend-chart__axis">
        <span>{data[0].date}</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const [sales, setSales] = useState(null);
  const [products, setProducts] = useState(null);
  const [status, setStatus] = useState(null);
  const [fulfillment, setFulfillment] = useState(null);
  const [payments, setPayments] = useState(null);
  const [trends, setTrends] = useState(null);
  const [communications, setCommunications] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Promise.allSettled en vez de Promise.all: si UN endpoint de G10 falla
  // (ej. inventario caído momentáneamente) el resto del dashboard igual
  // se pinta con lo que sí llegó, en vez de dejar toda la pantalla en
  // blanco por una sola falla parcial.
  const load = async () => {
    setLoading(true);
    setError(null);
    const [salesRes, productsRes, statusRes, fulfillmentRes, paymentsRes, trendsRes, commsRes, lowStockRes] =
      await Promise.allSettled([
        reportsApi.salesSummary({ groupBy: 'day' }),
        reportsApi.products({ limit: 5 }),
        reportsApi.status(),
        reportsApi.fulfillment(),
        reportsApi.paymentSummary(),
        reportsApi.orderTrends({ interval: 'day' }),
        reportsApi.communications(),
        inventoryApi.lowStock({ threshold: 10 })
      ]);

    if (salesRes.status === 'fulfilled') setSales(salesRes.value.data);
    if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data);
    if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data);
    if (fulfillmentRes.status === 'fulfilled') setFulfillment(fulfillmentRes.value.data);
    if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value.data);
    if (trendsRes.status === 'fulfilled') setTrends(trendsRes.value.data);
    if (commsRes.status === 'fulfilled') setCommunications(commsRes.value.data);
    if (lowStockRes.status === 'fulfilled') setLowStock(lowStockRes.value.data);

    // Solo se muestra el banner de error si TODO falló — si al menos un
    // reporte cargó, se prioriza mostrar contenido antes que un error.
    const allFailed = [salesRes, productsRes, statusRes, fulfillmentRes, paymentsRes, trendsRes, commsRes, lowStockRes].every(
      (r) => r.status === 'rejected'
    );
    if (allFailed) setError(salesRes.reason);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // G10 marca cada respuesta con source: "db" | "mock". Si CUALQUIERA de
  // los reportes viene en modo mock —por ejemplo porque su DATABASE_URL
  // no está configurada en ese momento en Render— se lo hacemos saber al
  // admin con el dato real, no con un aviso fijo.
  const isMock = [sales, products, status, fulfillment, payments, trends, communications, lowStock].some(
    (r) => r?.source === 'mock'
  );

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

      {!loading && isMock && (
        <div className="banner banner-info">
          ⚠️ Estos datos son de muestra: el servicio de Reportería (Grupo 10) no tiene su base de datos conectada
          en este momento (variable <code>DATABASE_URL</code> ausente de su lado), así que cayó a su modo mock.
          No requiere ninguna acción de tu parte — avísales para que la configuren en su despliegue.
        </div>
      )}

      {loading ? (
        <div className="card admin-empty">
          <Tideline loading />
        </div>
      ) : (
        <>
          <div className="stat-grid stat-grid--5">
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
            {trends?.insights && (
              <div className="stat-card">
                <span className="stat-card__label">Crecimiento del período</span>
                <span
                  className="stat-card__value"
                  style={{ color: trends.insights.growthRate >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                >
                  {signedPct(trends.insights.growthRate)}
                </span>
              </div>
            )}
          </div>

          {lowStock?.products?.length > 0 && (
            <div className="card admin-report-panel" style={{ marginBottom: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h2 className="admin-report-panel__title" style={{ marginBottom: 0 }}>
                  ⚠️ Stock bajo ({lowStock.totalProducts})
                </h2>
                <span className="admin-muted" style={{ fontSize: 12 }}>Umbral: {lowStock.threshold} unidades</span>
              </div>
              <div className="admin-table-wrap" style={{ marginTop: 'var(--space-4)' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th className="ta-right">Stock actual</th>
                      <th className="ta-right">Punto de reorden</th>
                      <th className="ta-right">Urgencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.products.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.name}</td>
                        <td>{p.category}</td>
                        <td className="ta-right mono">{p.currentStock}</td>
                        <td className="ta-right mono">{p.reorderPoint}</td>
                        <td className="ta-right">
                          <span
                            className={`admin-badge ship-status-${
                              p.urgency === 'critical' ? 'failed' : p.urgency === 'high' ? 'picking' : 'created'
                            }`}
                          >
                            {URGENCY_LABELS[p.urgency] || p.urgency}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {trends?.trends?.length > 0 && (
            <div className="card admin-report-panel" style={{ marginBottom: 'var(--space-5)' }}>
              <h2 className="admin-report-panel__title">Tendencia de ingresos</h2>
              <RevenueTrendChart data={trends.trends} />
              {trends.insights && (
                <p className="admin-muted" style={{ marginTop: 'var(--space-3)', fontSize: 12.5 }}>
                  Día de mayor venta: <strong>{trends.insights.peakDay}</strong> · Horario pico:{' '}
                  <strong>{trends.insights.peakHour}</strong>
                </p>
              )}
            </div>
          )}

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

            {communications?.byType?.length > 0 && (
              <div className="card admin-report-panel">
                <h2 className="admin-report-panel__title">Comunicaciones</h2>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Canal</th>
                        <th>Enviados</th>
                        <th className="ta-right">Tasa apertura</th>
                        <th className="ta-right">Tasa clic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communications.byType.map((c) => (
                        <tr key={c.type}>
                          <td>{COMM_LABELS[c.type] || c.type}</td>
                          <td>{c.count}</td>
                          <td className="ta-right">{pct(c.openRate)}</td>
                          <td className="ta-right">{pct(c.clickRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
