import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productsApi } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import CategoryPills from '../components/CategoryPills';
import ErrorBanner from '../components/ErrorBanner';
import Tideline from '../components/Tideline';
import { formatCLP } from '../utils/format';

const PAGE_SIZE = 12;

export default function CatalogPage() {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros aplicados en cliente sobre la página cargada (el BFF solo
  // soporta paginación y búsqueda por texto en /api/products).
  const [maxPrice, setMaxPrice] = useState(100000);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  const effectiveQuery = category || urlQuery;

  const load = useCallback(async (currentPage, currentQuery) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = currentQuery
        ? await productsApi.search(currentQuery, currentPage, PAGE_SIZE)
        : await productsApi.list(currentPage, PAGE_SIZE);
      setProducts(data?.data || []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotalResults(data?.pagination?.total ?? null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, effectiveQuery);
  }, [page, effectiveQuery, load]);

  useEffect(() => {
    setPage(1);
  }, [urlQuery]);

  const handleAdd = async (productId, quantity) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await addItem(productId, quantity);
  };

  const visibleProducts = useMemo(() => {
    let list = products.filter((p) => (p.price ?? 0) <= maxPrice);
    if (onlyInStock) list = list.filter((p) => (p.stockVisible ?? 0) > 0);
    if (sortBy === 'price_asc') list = [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sortBy === 'price_desc') list = [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (sortBy === 'name') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [products, maxPrice, onlyInStock, sortBy]);

  return (
    <>
      <CategoryPills active={category} onSelect={(kw) => { setCategory(kw); setPage(1); }} />

      <div className="page container">
        <div className="page-header">
          <h1>{effectiveQuery ? `Resultados para "${effectiveQuery}"` : 'Catálogo'}</h1>
          <p>Cañas, carretes y señuelos, directo desde el agua hasta tu puerta.</p>
        </div>

        {error && <ErrorBanner error={error} onRetry={() => load(page, effectiveQuery)} />}

        <div className="catalog-layout">
          <aside className="filters-panel">
            <h3>Filtros</h3>

            <div className="filters-panel__group">
              <h4>Rango de precio</h4>
              <input
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
              />
              <div className="filters-panel__price-range">
                <span>$0</span>
                <span>{maxPrice >= 100000 ? '$100.000+' : formatCLP(maxPrice)}</span>
              </div>
            </div>

            <div className="filters-panel__group">
              <h4>Disponibilidad</h4>
              <label>
                <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
                Solo con stock
              </label>
            </div>

            <div className="filters-panel__group">
              <h4>Ordenar por</h4>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}>
                <option value="relevance">Más relevantes</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm btn-block"
              onClick={() => {
                setMaxPrice(100000);
                setOnlyInStock(false);
                setSortBy('relevance');
              }}
            >
              Limpiar filtros
            </button>
          </aside>

          <div>
            <div className="results-meta">
              <span>
                {loading
                  ? 'Cargando…'
                  : `Mostrando ${visibleProducts.length}${totalResults ? ` de ${totalResults}` : ''} producto${visibleProducts.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Tideline loading />
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="empty-state card">
                <div className="empty-state__icon">🐟</div>
                <p>No encontramos productos para estos filtros.</p>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAdd={handleAdd} />
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
