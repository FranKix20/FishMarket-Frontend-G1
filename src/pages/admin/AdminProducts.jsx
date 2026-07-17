import { useEffect, useMemo, useState } from 'react';
import { catalogApi } from '../../api/catalog';
import { stockApi } from '../../api/client';
import ErrorBanner from '../../components/ErrorBanner';
import Tideline from '../../components/Tideline';
import AdminProductModal from '../../components/AdminProductModal';
import AdminStockModal from '../../components/AdminStockModal';
import { formatCLP } from '../../utils/format';

const PAGE_SIZE = 8;

const CHIPS = [
  { key: 'todos', label: 'Todos', match: () => true },
  { key: 'activos', label: 'Activos', match: (p) => p.isActive },
  { key: 'inactivos', label: 'Inactivos', match: (p) => !p.isActive }
];

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState('todos');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [stockById, setStockById] = useState({});
  const [stockModal, setStockModal] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes, stockRes] = await Promise.all([
        catalogApi.listProducts({ page: 1, size: 100, includeInactive: true }),
        catalogApi.listCategories(),
        // Stock real (Grupo 7) — puede no traer fila para productos recién
        // creados que aún no se sincronizaron de su lado; se maneja como
        // "sin registrar" más abajo en vez de asumir 0 falso.
        stockApi.list(1, 200).catch(() => ({ data: { data: [] } }))
      ]);
      setProducts(productsRes?.data || []);
      setCategories(categoriesRes?.data || []);
      const map = {};
      for (const row of stockRes?.data?.data || []) {
        map[row.productId] = row;
      }
      setStockById(map);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (fn) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err);
    }
  };

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || '—';

  const counts = useMemo(() => {
    const c = {};
    for (const def of CHIPS) c[def.key] = products.filter(def.match).length;
    return c;
  }, [products]);

  const filtered = useMemo(() => {
    const def = CHIPS.find((x) => x.key === chip) || CHIPS[0];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!def.match(p)) return false;
      if (!q) return true;
      return p.name?.toLowerCase().includes(q) || categoryName(p.categoryId).toLowerCase().includes(q);
    });
  }, [products, chip, search, categories]);

  useEffect(() => {
    setPage(1);
  }, [chip, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Gestión de catálogo</h1>
          <p className="admin-sub">Crea y administra productos, precios, imágenes y categorías.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
          + Nuevo producto
        </button>
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
        <input
          className="admin-search"
          placeholder="Buscar por nombre o categoría…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <ErrorBanner error={error} onRetry={load} />}

      <div className="card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
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
                  No hay productos que coincidan.
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-product">
                      <div className="admin-product__thumb">
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span>Sin imagen</span>}
                      </div>
                      <span className="admin-product__name">{p.name}</span>
                    </div>
                  </td>
                  <td>{categoryName(p.categoryId)}</td>
                  <td>{formatCLP(p.price)}</td>
                  <td>
                    {(() => {
                      const stock = stockById[p.id];
                      if (!stock || stock.availableStock === null || stock.availableStock === undefined) {
                        return <span className="admin-muted">Sin registrar</span>;
                      }
                      const low = stock.availableStock > 0 && stock.availableStock <= 5;
                      const out = stock.availableStock <= 0;
                      return (
                        <span className={out ? 'pill pill-danger' : low ? 'pill pill-warning' : undefined}>
                          {stock.availableStock}
                          {stock.reservedStock > 0 && (
                            <span className="admin-muted"> ({stock.reservedStock} reservado{stock.reservedStock === 1 ? '' : 's'})</span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <span className={`admin-badge status-${p.isActive ? 'active' : 'disabled'}`}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal({ mode: 'edit', product: p })}>
                        Editar
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setStockModal(p)}>
                        Reponer stock
                      </button>
                      {p.isActive ? (
                        <button
                          className="admin-icon-btn"
                          title="Desactivar"
                          onClick={() => run(() => catalogApi.setActive(p, false))}
                        >
                          ⏸
                        </button>
                      ) : (
                        <button
                          className="admin-icon-btn"
                          title="Activar"
                          onClick={() => run(() => catalogApi.setActive(p, true))}
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="admin-pager">
        <button className="btn btn-secondary btn-sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
          ← Anterior
        </button>
        <span className="admin-pager__info">
          Página {safePage} de {totalPages} · {filtered.length} productos
        </span>
        <button className="btn btn-secondary btn-sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
          Siguiente →
        </button>
      </div>

      {modal && (
        <AdminProductModal
          product={modal.mode === 'edit' ? modal.product : null}
          categories={categories}
          onClose={() => setModal(null)}
          onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}

      {stockModal && (
        <AdminStockModal
          product={stockModal}
          currentStock={stockById[stockModal.id]}
          onClose={() => setStockModal(null)}
          onSaved={() => {
            setStockModal(null);
            load();
          }}
        />
      )}
    </>
  );
}