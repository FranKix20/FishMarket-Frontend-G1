import { useEffect, useMemo, useState } from 'react';
import { logisticsApi } from '../../api/logistics';
import ErrorBanner from '../../components/ErrorBanner';
import Tideline from '../../components/Tideline';

const STATUS_LABELS = {
  CREATED: 'Creado',
  PICKING: 'Preparando',
  ASSIGNED: 'Asignado',
  OUT_FOR_DELIVERY: 'En reparto',
  DELIVERED: 'Entregado',
  FAILED: 'Fallido'
};

// Próximo paso "de avance simple" (PATCH de estado). DELIVERED se maneja
// aparte con /confirm porque ese endpoint pide evidencia de entrega.
const NEXT_STATUS = {
  CREATED: 'PICKING',
  PICKING: 'ASSIGNED',
  ASSIGNED: 'OUT_FOR_DELIVERY'
};

const CHIPS = [
  { key: 'todos', label: 'Todos', match: () => true },
  { key: 'activos', label: 'Activos', match: (s) => !['DELIVERED', 'FAILED'].includes(s.status) },
  { key: 'entregados', label: 'Entregados', match: (s) => s.status === 'DELIVERED' },
  { key: 'fallidos', label: 'Fallidos', match: (s) => s.status === 'FAILED' }
];

const PAGE_SIZE = 10;

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AdminShipments() {
  const [shipments, setShipments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chip, setChip] = useState('todos');
  const [search, setSearch] = useState('');
  const [driverFilter, setDriverFilter] = useState('todos');
  const [sortOrder, setSortOrder] = useState('recientes'); // 'recientes' | 'antiguos'
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [assigning, setAssigning] = useState(null); // shipmentId en selección de repartidor
  const [selectedDriver, setSelectedDriver] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [shipmentsRes, driversRes] = await Promise.all([
        logisticsApi.list(1, 100),
        logisticsApi.drivers().catch(() => [])
      ]);
      setShipments(shipmentsRes?.items || []);
      setDrivers(Array.isArray(driversRes) ? driversRes : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (shipmentId, fn) => {
    setBusyId(shipmentId);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusyId(null);
      setAssigning(null);
      setSelectedDriver('');
    }
  };

  const handleAdvance = (shipment) => {
    const next = NEXT_STATUS[shipment.status];
    if (!next) return;
    if (next === 'ASSIGNED') {
      setAssigning(shipment.shipmentId);
      return;
    }
    run(shipment.shipmentId, () => logisticsApi.updateStatus(shipment, next));
  };

  const confirmAssign = (shipment) => {
    if (!selectedDriver) return;
    const driver = drivers.find((d) => d.driver_id === selectedDriver);
    run(shipment.shipmentId, () =>
      logisticsApi.updateStatus(shipment, 'ASSIGNED', {
        driverId: driver?.driver_id,
        driverName: driver?.driver_name
      })
    );
  };

  const handleDeliver = (shipment) => {
    run(shipment.shipmentId, () =>
      logisticsApi.confirm(shipment, { type: 'SIMULATED_SIGNATURE', reference: 'confirmado-desde-panel-admin' })
    );
  };

  const handleReject = (shipment) => {
    const reason = window.prompt('Motivo del rechazo (visible para el cliente):', 'No se pudo entregar');
    if (reason === null) return;
    run(shipment.shipmentId, () => logisticsApi.reject(shipment, reason));
  };

  const handleReship = (shipment) => {
    if (!window.confirm(`¿Generar un nuevo envío de reemplazo para el pedido ${shipment.orderId}?`)) return;
    run(shipment.shipmentId, () => logisticsApi.reship(shipment, 'Reenvío solicitado desde el panel admin'));
  };

  const counts = useMemo(() => {
    const c = {};
    for (const def of CHIPS) c[def.key] = shipments.filter(def.match).length;
    return c;
  }, [shipments]);

  const filtered = useMemo(() => {
    const def = CHIPS.find((x) => x.key === chip) || CHIPS[0];
    const q = search.trim().toLowerCase();
    const rows = shipments.filter((s) => {
      if (!def.match(s)) return false;
      if (driverFilter === 'sin_asignar' && s.driverName) return false;
      if (driverFilter !== 'todos' && driverFilter !== 'sin_asignar' && s.driverName !== driverFilter) return false;
      if (!q) return true;
      return (
        s.orderId?.toLowerCase().includes(q) ||
        s.shipmentId?.toLowerCase().includes(q) ||
        s.shipTo?.fullName?.toLowerCase().includes(q)
      );
    });

    // G8 no garantiza ningún orden particular en /v1/shipments (por eso
    // las fechas se veían salteadas) — se ordena siempre acá, por
    // fecha de última actualización. Los envíos sin fecha válida van al
    // final en vez de romper el orden del resto.
    const sorted = [...rows].sort((a, b) => {
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      const va = Number.isNaN(ta) ? -Infinity : ta;
      const vb = Number.isNaN(tb) ? -Infinity : tb;
      return sortOrder === 'recientes' ? vb - va : va - vb;
    });

    return sorted;
  }, [shipments, chip, search, driverFilter, sortOrder]);

  // Lista de repartidores que efectivamente tienen envíos asignados,
  // para no mostrar en el filtro nombres sin ningún envío.
  const driverOptions = useMemo(() => {
    const names = new Set(shipments.map((s) => s.driverName).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [shipments]);

  useEffect(() => {
    setPage(1);
  }, [chip, search, driverFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Envíos</h1>
          <p className="admin-sub">
            Seguimiento y estados de despacho — servicio de Logística (Grupo 8).
          </p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-chips">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              className={`admin-chip ${chip === c.key ? 'is-active' : ''}`}
              onClick={() => setChip(c.key)}
            >
              {c.label} <span className="admin-chip__count">({counts[c.key] ?? 0})</span>
            </button>
          ))}
        </div>
        <div className="admin-toolbar__filters">
          <select
            className="admin-select-sm"
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            title="Filtrar por repartidor"
          >
            <option value="todos">Todos los repartidores</option>
            <option value="sin_asignar">Sin asignar</option>
            {driverOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="admin-select-sm"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            title="Ordenar por fecha"
          >
            <option value="recientes">Más recientes primero</option>
            <option value="antiguos">Más antiguos primero</option>
          </select>
          <input
            className="admin-search"
            placeholder="Buscar por pedido, envío o destinatario…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <ErrorBanner error={error} onRetry={load} />}

      <div className="card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Envío</th>
              <th>Destinatario</th>
              <th>Repartidor</th>
              <th>Actualizado</th>
              <th>Estado</th>
              <th className="ta-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="admin-empty">
                  <Tideline loading />
                </td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan="6" className="admin-empty">
                  No hay envíos que coincidan.
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((s) => {
                const next = NEXT_STATUS[s.status];
                const isBusy = busyId === s.shipmentId;
                return (
                  <tr key={s.shipmentId}>
                    <td>
                      <div className="admin-user__info">
                        <span className="admin-user__name">Pedido {s.orderId}</span>
                        <span className="admin-user__sub mono">{s.shipmentId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-user__info">
                        <span className="admin-user__name">{s.shipTo?.fullName || '—'}</span>
                        <span className="admin-user__sub">
                          {s.shipTo?.city}
                          {s.shipTo?.region ? `, ${s.shipTo.region}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>{s.driverName || <span className="admin-muted">Sin asignar</span>}</td>
                    <td>{fmtDate(s.updatedAt)}</td>
                    <td>
                      <span className={`admin-badge ship-status-${s.status.toLowerCase()}`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>
                    <td>
                      {assigning === s.shipmentId ? (
                        <div className="admin-actions">
                          <select
                            className="admin-select-sm"
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                          >
                            <option value="">Elegir repartidor…</option>
                            {drivers.map((d) => (
                              <option key={d.driver_id} value={d.driver_id}>
                                {d.driver_name}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={!selectedDriver || isBusy}
                            onClick={() => confirmAssign(s)}
                          >
                            Asignar
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setAssigning(null)}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="admin-actions">
                          {next && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={isBusy}
                              onClick={() => handleAdvance(s)}
                            >
                              {isBusy ? '…' : `→ ${STATUS_LABELS[next]}`}
                            </button>
                          )}
                          {s.status === 'OUT_FOR_DELIVERY' && (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={isBusy}
                              onClick={() => handleDeliver(s)}
                            >
                              Confirmar entrega
                            </button>
                          )}
                          {!['DELIVERED', 'FAILED'].includes(s.status) && (
                            <button
                              className="admin-icon-btn is-danger"
                              title="Marcar como fallido"
                              disabled={isBusy}
                              onClick={() => handleReject(s)}
                            >
                              ✕
                            </button>
                          )}
                          {s.status === 'FAILED' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={isBusy}
                              onClick={() => handleReship(s)}
                            >
                              Reenviar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="admin-pager">
        <button className="btn btn-secondary btn-sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
          ← Anterior
        </button>
        <span className="admin-pager__info">
          Página {safePage} de {totalPages} · {filtered.length} envíos
        </span>
        <button
          className="btn btn-secondary btn-sm"
          disabled={safePage >= totalPages}
          onClick={() => setPage(safePage + 1)}
        >
          Siguiente →
        </button>
      </div>
    </>
  );
}
