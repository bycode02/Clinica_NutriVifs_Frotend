import type { Profile, Role, Session } from "../context/AppContext";
import type { AuthResponse, RolApi, UsuarioApi, UsuarioForm } from "../types/auth";

// El backend usa ADMIN / SELLER / CLIENT; las pantallas usan los nombres en español.
const ROLES_API: Record<RolApi, Role> = {
  ADMIN: "Administrador",
  SELLER: "Vendedor",
  CLIENT: "Cliente",
};

export function rolDesdeApi(rol: RolApi): Role {
  return ROLES_API[rol] ?? "Cliente";
}

export function rolHaciaApi(rol: Role | undefined): RolApi {
  return rol === "Administrador" ? "ADMIN" : rol === "Vendedor" ? "SELLER" : "CLIENT";
}

// Usuario de la API -> Profile que usan los formularios y el panel (la clave nunca viene)
export function perfilDesdeApi(u: UsuarioApi): Profile {
  return {
    name: u.name, apellido: u.lastName, email: u.email, birthDate: u.birthDate,
    direccion: u.address, genero: u.gender, phone: u.phone ?? "", region: u.region,
    comuna: u.comuna, password: "", failedAttempts: u.failedAttempts, locked: u.locked,
    role: rolDesdeApi(u.role),
  };
}

// Profile del formulario -> cuerpo para /users
export function usuarioHaciaApi(p: Profile): UsuarioForm {
  return {
    name: p.name, lastName: p.apellido, email: p.email, password: p.password,
    birthDate: p.birthDate, phone: p.phone || "+", address: p.direccion, region: p.region,
    comuna: p.comuna, gender: p.genero, role: rolHaciaApi(p.role), locked: p.locked,
  };
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
