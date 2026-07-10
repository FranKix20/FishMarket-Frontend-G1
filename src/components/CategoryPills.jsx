const CATEGORIES = [
  { label: 'Todos', keyword: '' },
  { label: 'Cañas', keyword: 'caña' },
  { label: 'Carretes', keyword: 'carrete' },
  { label: 'Señuelos', keyword: 'señuelo' },
  { label: 'Líneas', keyword: 'línea' },
  { label: 'Anzuelos', keyword: 'anzuelo' },
  { label: 'Accesorios', keyword: 'accesorio' }
];

/**
 * Filtro rápido por categoría. El BFF no expone un parámetro de
 * categoría en /api/products, así que cada pill dispara una búsqueda
 * por palabra clave (categoryName/name/description) contra
 * /api/products/search — funcional de extremo a extremo, no decorativo.
 */
export default function CategoryPills({ active, onSelect }) {
  return (
    <div className="category-bar">
      <div className="container category-bar__inner">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            type="button"
            className={`category-pill ${active === cat.keyword ? 'is-active' : ''}`}
            onClick={() => onSelect(cat.keyword)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
