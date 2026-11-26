// Tipos de /api/v1/auth (iguales a los DTO del backend)

export type RolApi = "ADMIN" | "SELLER" | "CLIENT";

// Respuesta de register, login y refresh
export interface AuthResponse {
  token: string;
  type: "Bearer";
  // Segundos que dura el token
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
  name: string;
  lastName: string;
  email: string;
  // yyyy-MM-dd
  birthDate: string;
  phone: string | null;
  role: RolApi;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  lastName: string;
  email: string;
  password: string;
  // yyyy-MM-dd, como lo entrega <input type="date">
  birthDate: string;
  // Opcional: "+56912345678" o "+" si está vacío
  phone: string;
  address: string;
  region: string;
  comuna: string;
  gender: "femenino" | "masculino" | "otro" | "prefiero-no-decir";
  acceptTerms: boolean;
}
