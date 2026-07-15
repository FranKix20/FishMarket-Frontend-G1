import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ErrorBanner from '../components/ErrorBanner';
import Tideline from '../components/Tideline';
import ProductCard from '../components/ProductCard';
import { formatCLP } from '../utils/format';

function stockBadge(stockVisible) {
  if (stockVisible === 0) return { label: 'Sin stock', cls: 'pill-danger' };
  if (stockVisible > 0 && stockVisible <= 5) return { label: `Stock bajo · quedan ${stockVisible}`, cls: 'pill-warning' };
  return { label: 'En stock', cls: 'pill-success' };
}

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [addError, setAddError] = useState(null);
  const [related, setRelated] = useState([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await productsApi.get(productId);
      setProduct(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setQuantity(1);
    window.scrollTo({ top: 0 });
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Productos relacionados: intenta traer más de la misma categoría; si el
  // catálogo no soporta ese filtro server-side, cae a los primeros del
  // listado general (igual de válido, solo menos dirigido).
  useEffect(() => {
    let cancelled = false;
    async function loadRelated() {
      if (!product) return;
      try {
        const { data } = product.categoryName
          ? await productsApi.search(product.categoryName, 1, 8)
          : await productsApi.list(1, 8);
        if (!cancelled) {
          setRelated((data.data || []).filter((p) => p.id !== product.id).slice(0, 4));
        }
      } catch {
        if (!cancelled) setRelated([]);
      }
    }
    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [product]);

  const handleAdd = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setAdding(true);
    setJustAdded(false);
    setAddError(null);
    try {
      await addItem(product.id, quantity);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    } catch (err) {
      setAddError(err?.message || 'No se pudo agregar al carrito.');
    } finally {
      setAdding(false);
    }
  };

  const handleAddRelated = async (id, qty) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await addItem(id, qty);
  };

  if (loading) {
    return (
      <div className="page container" style={{ textAlign: 'center', paddingTop: 64 }}>
        <Tideline loading />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="page container">
        <ErrorBanner error={error || { message: 'No encontramos este producto.' }} onRetry={load} />
        <Link to="/">← Volver al catálogo</Link>
      </div>
    );
  }

  const badge = stockBadge(product.stockVisible);
  const outOfStock = product.stockVisible === 0;

  return (
    <div className="page container">
      <div className="breadcrumb">
        <Link to="/">Inicio</Link>
        <span>›</span>
        {product.categoryName && (
          <>
            <span>{product.categoryName}</span>
            <span>›</span>
          </>
        )}
        <span>{product.name}</span>
      </div>

      <div className="product-detail">
        <div className="product-detail__image">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} />
          ) : (
            <div className="product-detail__image-fallback" aria-hidden="true">
              🎣
            </div>
          )}
        </div>

        <div>
          {product.categoryName && <p className="product-detail__category">{product.categoryName}</p>}
          <span className={`pill ${badge.cls}`}>{badge.label}</span>
          <h1 className="product-detail__title" style={{ marginTop: 12 }}>
            {product.name}
          </h1>

          <p className="product-detail__price">{formatCLP(product.price)}</p>

          {product.description && <p className="product-detail__desc">{product.description}</p>}

          <div className="product-detail__trust">
            <div className="product-detail__trust-item">🚚 Envío 1-3 días hábiles</div>
            <div className="product-detail__trust-item">🛡️ Garantía oficial</div>
            <div className="product-detail__trust-item">↩️ Devoluciones hasta 30 días</div>
            <div className="product-detail__trust-item">🔒 Compra 100% segura</div>
          </div>

          <div className="product-detail__buy-row">
            <div className="qty-stepper">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={outOfStock}>
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => (typeof product.stockVisible === 'number' ? Math.min(product.stockVisible, q + 1) : q + 1))}
                disabled={outOfStock || (typeof product.stockVisible === 'number' && quantity >= product.stockVisible)}
              >
                +
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={outOfStock || adding}>
              {adding ? 'Agregando…' : justAdded ? 'Agregado ✓' : outOfStock ? 'Sin stock' : 'Agregar al carrito'}
            </button>
          </div>
          {typeof product.stockVisible === 'number' && quantity >= product.stockVisible && !outOfStock && (
            <p className="product-detail__stock-hint">Llegaste al máximo disponible ({product.stockVisible}).</p>
          )}
          {addError && (
            <p className="product-detail__error" role="alert">
              {addError}
            </p>
          )}

          <table className="specs-table">
            <tbody>
              <tr>
                <th>Categoría</th>
                <td>{product.categoryName || 'Sin categoría'}</td>
              </tr>
              <tr>
                <th>Disponibilidad</th>
                <td>{outOfStock ? 'Sin stock' : `${product.stockVisible} unidades disponibles`}</td>
              </tr>
              <tr>
                <th>SKU</th>
                <td className="mono">{product.id}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {related.length > 0 && (
        <section className="related-section">
          <h2 className="related-section__title">También te puede interesar</h2>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={handleAddRelated} />
            ))}
          </div>
        </section>
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
