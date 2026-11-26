import type { Role, Session } from "../context/AppContext";
import type { AuthResponse, RolApi } from "../types/auth";

// El backend usa ADMIN / SELLER / CLIENT; las pantallas usan los nombres en español.
const ROLES_API: Record<RolApi, Role> = {
  ADMIN: "Administrador",
  SELLER: "Vendedor",
  CLIENT: "Cliente",
};

export function rolDesdeApi(rol: RolApi): Role {
  return ROLES_API[rol] ?? "Cliente";
}

// Datos de sesión que se muestran en pantalla (Navbar, Perfil) a partir de la respuesta del login
export function sesionDesdeApi(auth: AuthResponse): Session {
  return {
    name: auth.name,
    apellido: auth.lastName,
    email: auth.email,
    birthDate: auth.birthDate,
    phone: auth.phone ?? "",
    role: rolDesdeApi(auth.role),
  };
}
