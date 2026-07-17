// G3 (Catálogo) no devuelve category_name en sus productos, solo
// category_id (ver comentario en el BFF, api/products/routes.js) — por
// eso categoryName siempre llega null desde el backend. Mientras eso no
// cambie de su lado, inferimos una categoría de exhibición a partir del
// nombre/descripción del producto, usando EXACTAMENTE las mismas palabras
// clave que ya usa CategoryPills para filtrar el catálogo — no es un dato
// inventado nuevo, es la misma regla que el resto de la app ya usa y en
// la que ya confiamos para las búsquedas por categoría.
const CATEGORY_KEYWORDS = [
  { label: 'Cañas', keyword: 'caña' },
  { label: 'Carretes', keyword: 'carrete' },
  { label: 'Señuelos', keyword: 'señuelo' },
  { label: 'Líneas', keyword: 'línea' },
  { label: 'Anzuelos', keyword: 'anzuelo' },
  { label: 'Accesorios', keyword: 'accesorio' }
];

export function inferCategoryLabel(product) {
  if (!product) return null;
  const haystack = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  const match = CATEGORY_KEYWORDS.find(({ keyword }) => haystack.includes(keyword));
  return match?.label || null;
}
