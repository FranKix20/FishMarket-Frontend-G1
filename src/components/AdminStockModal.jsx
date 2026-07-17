import { useState } from 'react';
import { stockApi } from '../api/client';
import ErrorBanner from './ErrorBanner';

// El stock real vive en Grupo 7 (Inventario), no en el catálogo (Grupo 3),
// por eso este es un modal separado de "Editar producto": son dos
// servicios distintos con dueños distintos. `operation` refleja el
// contrato real de G7: 'SET' fija el disponible a un valor exacto,
// 'ADD' suma unidades a lo que ya hay (ej. llegó un despacho nuevo).
export default function AdminStockModal({ product, currentStock, onClose, onSaved }) {
  const [operation, setOperation] = useState('ADD');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const isRegistered =
    currentStock && currentStock.availableStock !== null && currentStock.availableStock !== undefined;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      setError({ message: 'Ingresa una cantidad válida (0 o más).' });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await stockApi.setStock(product.id, qty, operation);
      onSaved();
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="card admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Reponer stock</h2>
        <p className="admin-field-hint" style={{ marginBottom: 'var(--space-4)' }}>
          {product.name} · gestionado por el servicio de Inventario (Grupo 7).
        </p>

        {error && <ErrorBanner error={error} />}

        {isRegistered ? (
          <div className="account-data-grid" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <dt>Disponible</dt>
              <dd>{currentStock.availableStock}</dd>
            </div>
            <div>
              <dt>Reservado</dt>
              <dd>{currentStock.reservedStock}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{currentStock.totalStock}</dd>
            </div>
          </div>
        ) : (
          <div className="banner banner-warning" role="status" style={{ marginBottom: 'var(--space-4)' }}>
            <p>
              Este producto todavía no tiene una fila de inventario registrada en Grupo 7 (puede pasar con
              productos recién creados). El primer ajuste que hagas aquí la va a crear.
            </p>
          </div>
        )}

        <div className="field">
          <label htmlFor="stock-operation">Tipo de ajuste</label>
          <select id="stock-operation" value={operation} onChange={(e) => setOperation(e.target.value)}>
            <option value="ADD">Sumar unidades (llegó mercadería)</option>
            <option value="SET">Fijar disponible en un valor exacto</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="stock-quantity">{operation === 'ADD' ? 'Unidades a sumar' : 'Nuevo disponible'}</label>
          <input
            id="stock-quantity"
            type="number"
            min="0"
            step="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={operation === 'ADD' ? 'Ej. 20' : 'Ej. 50'}
          />
        </div>

        <div className="admin-modal__actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || quantity === ''}>
            {saving ? 'Guardando…' : 'Confirmar ajuste'}
          </button>
        </div>
      </form>
    </div>
  );
}
