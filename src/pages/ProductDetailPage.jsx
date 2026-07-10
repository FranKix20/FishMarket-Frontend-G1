import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ErrorBanner from '../components/ErrorBanner';
import Tideline from '../components/Tideline';
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
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setAdding(true);
    setJustAdded(false);
    try {
      await addItem(product.id, quantity);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    } finally {
      setAdding(false);
    }
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
              <button type="button" onClick={() => setQuantity((q) => q + 1)} disabled={outOfStock}>
                +
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={outOfStock || adding}>
              {adding ? 'Agregando…' : justAdded ? 'Agregado ✓' : outOfStock ? 'Sin stock' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
