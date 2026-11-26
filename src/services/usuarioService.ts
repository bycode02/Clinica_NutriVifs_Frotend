import { api } from "../api/axiosConfig";
import type { UsuarioApi, UsuarioForm } from "../types/auth";

// Usuarios: /api/v1/users
// - /users/me: perfil propio (cualquier usuario con sesión)
// - el resto: solo Administrador

export async function obtenerMiPerfil(): Promise<UsuarioApi> {
  const respuesta = await api.get<UsuarioApi>("/users/me");
  return respuesta.data;
}

// No cambia correo, rol ni clave
export async function actualizarMiPerfil(datos: UsuarioForm): Promise<UsuarioApi> {
  const respuesta = await api.put<UsuarioApi>("/users/me", datos);
  return respuesta.data;
}

export async function obtenerUsuarios(): Promise<UsuarioApi[]> {
  const respuesta = await api.get<UsuarioApi[]>("/users");
  return respuesta.data;
}

export async function crearUsuario(datos: UsuarioForm): Promise<UsuarioApi> {
  const respuesta = await api.post<UsuarioApi>("/users", datos);
  return respuesta.data;
}

// password vacía = no se cambia; locked=false desbloquea la cuenta
export async function actualizarUsuario(email: string, datos: UsuarioForm): Promise<UsuarioApi> {
  const respuesta = await api.put<UsuarioApi>(`/users/${encodeURIComponent(email)}`, datos);
  return respuesta.data;
}

// 409 si el usuario tiene compras
export async function eliminarUsuario(email: string): Promise<void> {
  await api.delete(`/users/${encodeURIComponent(email)}`);
}
