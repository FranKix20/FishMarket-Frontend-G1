import AdminSectionStub from '../../components/AdminSectionStub';

// TODO(G1): implementar la gestión de productos y stock.
export default function AdminProducts() {
  return (
    <AdminSectionStub
      title="Productos"
      subtitle="Crear y gestionar el catálogo, precios y stock."
      primaryLabel="+ Nuevo producto"
      description="Administración del catálogo del marketplace: alta y edición de productos, categorías, precios y control de stock."
      todos={[
        'Crear producto (nombre, descripción, categoría, precio, imagen)',
        'Editar y activar/desactivar productos',
        'Control de stock (existencias y umbral de reposición)',
        'Gestión de categorías'
      ]}
      columns={['Producto', 'Categoría', 'Precio', 'Stock', 'Estado', 'Acción']}
      backend="Catálogo — Grupo 3. La lectura ya existe en productsApi (list/search/get, en src/api/client.js); falta el endpoint de creación/edición/stock (BFF → G3)."
    />
  );
}
