import { useState } from 'react';
import { catalogApi } from '../api/catalog';
import ErrorBanner from './ErrorBanner';

export default function AdminProductModal({ product, categories, onClose, onSaved, onCategoryCreated }) {
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setSavingCategory(true);
    setError(null);
    try {
      const created = await catalogApi.createCategory({ name: trimmed });
      onCategoryCreated?.(created);
      setCategoryId(created.id);
      setAddingCategory(false);
      setNewCategoryName('');
    } catch (err) {
      setError(err);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        categoryId,
        imageUrl: imageUrl.trim()
      };
      if (isEdit) {
        await catalogApi.updateProduct(product.id, { ...payload, isActive });
      } else {
        await catalogApi.createProduct(payload);
      }
      onSaved();
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="card admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>

        {error && <ErrorBanner error={error} />}

        {isEdit && (
          <div className="field">
            <label>ID producto</label>
            <input type="text" value={product.id} disabled />
          </div>
        )}

        <div className="field">
          <label htmlFor="ap-name">Nombre</label>
          <input id="ap-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="ap-desc">Descripción</label>
          <textarea
            id="ap-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="ap-price">Precio (CLP)</label>
            <input
              id="ap-price"
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="ap-stock">Stock visible</label>
            <input
              id="ap-stock"
              type="text"
              value={isEdit ? product.stockVisible ?? 0 : 'Se define al crear'}
              disabled
              title="El stock lo gestiona Grupo 7"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="ap-category">Categoría</label>
          <select id="ap-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">Selecciona una categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {!addingCategory ? (
          <button type="button" className="admin-link-btn" onClick={() => setAddingCategory(true)}>
            + Nueva categoría
          </button>
        ) : (
          <div className="admin-inline-add">
            <input
              type="text"
              placeholder="Nombre de la categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={savingCategory || !newCategoryName.trim()}
              onClick={handleCreateCategory}
            >
              {savingCategory ? 'Creando…' : 'Crear'}
            </button>
            <button type="button" className="admin-link-btn" onClick={() => setAddingCategory(false)}>
              Cancelar
            </button>
          </div>
        )}

        <div className="field">
          <label htmlFor="ap-image">URL de imagen</label>
          <input
            id="ap-image"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
          />
        </div>

        {isEdit && (
          <div className="field">
            <label htmlFor="ap-active">Estado</label>
            <select id="ap-active" value={isActive ? '1' : '0'} onChange={(e) => setIsActive(e.target.value === '1')}>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
        )}

        <div className="admin-modal__actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  );
}