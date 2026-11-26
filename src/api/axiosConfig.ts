import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { AuthResponse } from "../types/auth";
import { borrarTokens, guardarTokens, obtenerRefreshToken, obtenerToken } from "./tokenStorage";

// Todas las rutas del backend empiezan con /api/v1 (ej. /api/v1/products).
// En los servicios basta con escribir "/products".
const API_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:8080"}/api/v1`;

// Se emite cuando la sesión ya no se puede renovar (refresh vencido o cerrado).
// AppProvider lo escucha para cerrar la sesión en pantalla y mandar al login.
export const SESION_EXPIRADA = "clinica:sesion-expirada";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

// Instancia sin interceptores, solo para /auth/refresh (así no se llama a sí misma en bucle)
const apiSinInterceptores = axios.create({ baseURL: API_URL, timeout: 5000 });

// 1) Agrega el JWT a cada petición si hay sesión
api.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2) Si el JWT venció (401), pide uno nuevo con el refresh token y repite la petición.
//    Si llegan varias peticiones con 401 a la vez, todas esperan el mismo refresh.
let renovando: Promise<string> | null = null;

async function renovarToken(): Promise<string> {
  const refreshToken = obtenerRefreshToken();
  if (!refreshToken) {
    throw new Error("Sin refresh token");
  }
  const { data } = await apiSinInterceptores.post<AuthResponse>("/auth/refresh", { refreshToken });
  // El refresh token sirve una sola vez: se guarda el nuevo que entrega el backend
  guardarTokens({ token: data.token, refreshToken: data.refreshToken });
  return data.token;
}

type ConfigReintento = InternalAxiosRequestConfig & { _reintentado?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as ConfigReintento | undefined;
    const esRutaAuth = original?.url?.startsWith("/auth/");

    // Solo se renueva una vez por petición, y nunca para login/registro/refresh
    if (error.response?.status !== 401 || !original || original._reintentado || esRutaAuth) {
      return Promise.reject(error);
    }
    if (!obtenerRefreshToken()) {
      return Promise.reject(error);
    }

    original._reintentado = true;
    try {
      renovando ??= renovarToken().finally(() => {
        renovando = null;
      });
      const nuevoToken = await renovando;
      original.headers.Authorization = `Bearer ${nuevoToken}`;
      return api(original);
    } catch {
      // El refresh también falló: la sesión terminó de verdad
      borrarTokens();
      window.dispatchEvent(new Event(SESION_EXPIRADA));
      return Promise.reject(error);
    }
  },
);
