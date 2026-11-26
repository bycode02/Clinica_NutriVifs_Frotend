// Tipos de /api/v1/products y /api/v1/categories (iguales a las entidades del backend)

export interface Categoria {
  id: number;
  // Siempre en MAYÚSCULAS
  name: string;
}

export interface Producto {
  // Código del producto, ej. "ME001"
  id: string;
  name: string;
  distributor: string;
  description: string | null;
  price: number;
  stock: number;
  image: string | null;
  activeIngredient: string | null;
  species: string | null;
  category: Categoria;
}

// Datos para crear o editar un producto. La categoría se envía solo con su id.
export interface ProductoForm {
  id: string;
  name: string;
  distributor: string;
  description?: string;
  price: number;
  stock: number;
  image?: string;
  activeIngredient?: string;
  species?: string;
  categoryId: number;
}
