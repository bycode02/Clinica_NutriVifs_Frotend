import { api } from "../api/axiosConfig";
import { borrarTokens, guardarTokens, obtenerRefreshToken } from "../api/tokenStorage";
import type { AuthResponse, LoginRequest, RegisterRequest } from "../types/auth";

// Login, registro y cierre de sesión: /api/v1/auth
// Al iniciar sesión o registrarse, los tokens quedan guardados y axiosConfig
// los agrega solo a las siguientes peticiones.

export async function iniciarSesion(datos: LoginRequest): Promise<AuthResponse> {
  const respuesta = await api.post<AuthResponse>("/auth/login", datos);
  guardarTokens(respuesta.data);
  return respuesta.data;
}

// Crea una cuenta de Cliente y deja la sesión iniciada
export async function registrarse(datos: RegisterRequest): Promise<AuthResponse> {
  const respuesta = await api.post<AuthResponse>("/auth/register", datos);
  guardarTokens(respuesta.data);
  return respuesta.data;
}

// Avisa al backend para invalidar el refresh token. Aunque falle (ej. sin conexión),
// los tokens se borran igual: en este navegador la sesión queda cerrada.
export async function cerrarSesion(): Promise<void> {
  const refreshToken = obtenerRefreshToken();
  try {
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken });
    }
  } finally {
    borrarTokens();
  }
}
