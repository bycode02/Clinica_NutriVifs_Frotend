import { api } from "../api/axiosConfig";
import type { Categoria } from "../types/producto";

// Categorías: /api/v1/categories
// - Ver: cualquiera, sin iniciar sesión
// - Crear, editar y eliminar: solo Administrador
// El backend guarda el nombre en MAYÚSCULAS y no deja eliminar una categoría con productos (409).

export async function obtenerCategorias(): Promise<Categoria[]> {
  const respuesta = await api.get<Categoria[]>("/categories");
  return respuesta.data;
}

export async function obtenerCategoria(id: number): Promise<Categoria> {
  const respuesta = await api.get<Categoria>(`/categories/${id}`);
  return respuesta.data;
}

export async function crearCategoria(name: string): Promise<Categoria> {
  const respuesta = await api.post<Categoria>("/categories", { name });
  return respuesta.data;
}

export async function actualizarCategoria(id: number, name: string): Promise<Categoria> {
  const respuesta = await api.put<Categoria>(`/categories/${id}`, { name });
  return respuesta.data;
}

export async function eliminarCategoria(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}
