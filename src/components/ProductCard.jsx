import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCLP } from '../utils/format';

function stockBadge(stockVisible) {
  if (stockVisible === 0) return { label: 'Sin stock', cls: 'pill-danger' };
  if (stockVisible > 0 && stockVisible <= 5) return { label: 'Stock bajo', cls: 'pill-warning' };
  return { label: 'En stock', cls: 'pill-success' };
}

export default function ProductCard({ product, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [addError, setAddError] = useState(null);

  const outOfStock = product.stockVisible === 0;
  const atStockLimit = typeof product.stockVisible === 'number' && quantity >= product.stockVisible;
  const badge = stockBadge(product.stockVisible);

  const handleAdd = async () => {
    setAdding(true);
    setJustAdded(false);
    setAddError(null);
    try {
      await onAdd(product.id, quantity);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    } catch (err) {
      setAddError(err?.response?.data?.message || 'No se pudo agregar al carrito.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="card product-card">
      <Link to={`/productos/${product.id}`} className="product-card__image" tabIndex={-1}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-card__image-fallback" aria-hidden="true">
            🎣
          </div>
        )}
        <span className={`pill ${badge.cls} product-card__stock-badge`}>{badge.label}</span>
      </Link>

      <div className="product-card__body">
        <h3 className="product-card__name">
          <Link to={`/productos/${product.id}`}>{product.name}</Link>
        </h3>
        {product.description && <p className="product-card__desc">{product.description}</p>}

        <div className="product-card__footer">
          <span className="product-card__price">{formatCLP(product.price)}</span>

          <div className="product-card__actions">
            <div className="qty-stepper">
              <button
                type="button"
                aria-label="Restar unidad"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={outOfStock}
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                aria-label="Sumar unidad"
                onClick={() => setQuantity((q) => (typeof product.stockVisible === 'number' ? Math.min(product.stockVisible, q + 1) : q + 1))}
                disabled={outOfStock || atStockLimit}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm btn-block"
              onClick={handleAdd}
              disabled={outOfStock || adding}
            >
              {adding ? 'Agregando…' : justAdded ? 'Agregado ✓' : outOfStock ? 'Sin stock' : 'Agregar al carrito'}
            </button>
            {addError && (
              <p className="product-card__error" role="alert">
                {addError}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
