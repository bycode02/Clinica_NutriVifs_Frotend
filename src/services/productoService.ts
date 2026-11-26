import { api } from "../api/axiosConfig";
import type { Producto, ProductoForm } from "../types/producto";

// Productos: /api/v1/products
// - Ver: cualquiera, sin iniciar sesión
// - Crear, editar y cambiar stock: Administrador y Vendedor
// - Eliminar: solo Administrador

// El backend recibe la categoría como { id }, no como categoryId
function cuerpo(producto: ProductoForm) {
  const { categoryId, ...resto } = producto;
  return { ...resto, category: { id: categoryId } };
}

// categoryId opcional: filtra por categoría
export async function obtenerProductos(categoryId?: number): Promise<Producto[]> {
  const respuesta = await api.get<Producto[]>("/products", {
    params: categoryId ? { categoryId } : undefined,
  });
  return respuesta.data;
}

export async function obtenerProducto(id: string): Promise<Producto> {
  const respuesta = await api.get<Producto>(`/products/${encodeURIComponent(id)}`);
  return respuesta.data;
}

export async function crearProducto(producto: ProductoForm): Promise<Producto> {
  const respuesta = await api.post<Producto>("/products", cuerpo(producto));
  return respuesta.data;
}

// El código (id) no cambia: se usa el de la URL
export async function actualizarProducto(id: string, producto: ProductoForm): Promise<Producto> {
  const respuesta = await api.put<Producto>(`/products/${encodeURIComponent(id)}`, cuerpo(producto));
  return respuesta.data;
}

// Cambia solo el stock (lo usa el Vendedor)
export async function actualizarStock(id: string, stock: number): Promise<Producto> {
  const respuesta = await api.patch<Producto>(`/products/${encodeURIComponent(id)}/stock`, { stock });
  return respuesta.data;
}

export async function eliminarProducto(id: string): Promise<void> {
  await api.delete(`/products/${encodeURIComponent(id)}`);
}
