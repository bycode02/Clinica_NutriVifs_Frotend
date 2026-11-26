// Guarda los tokens que entrega el backend al iniciar sesión.
// - token: JWT corto (60 min) que va en el header Authorization.
// - refreshToken: token largo (7 días) para pedir un JWT nuevo sin volver a iniciar sesión.
const TOKEN_KEY = "clinica-nutridifs-token";
const REFRESH_KEY = "clinica-nutridifs-refresh-token";

export interface Tokens {
  token: string;
  refreshToken: string;
}

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export function obtenerToken(): string | null {
  return leer(TOKEN_KEY);
}

export function obtenerRefreshToken(): string | null {
  return leer(REFRESH_KEY);
}

export function guardarTokens({ token, refreshToken }: Tokens) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function borrarTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
