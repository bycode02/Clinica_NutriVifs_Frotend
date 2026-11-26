import { createContext, useContext } from "react";
import type { MiembroEquipo } from "../data/equipo";
import type { Producto } from "../data/productos";
import type { RegisterRequest } from "../types/auth";

export type Role = "Administrador" | "Vendedor" | "Cliente";

export type CartItem = {
  code: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

export type Profile = {
  name: string;
  apellido: string;
  email: string;
  birthDate: string;
  direccion: string;
  genero: string;
  phone: string;
  region: string;
  comuna: string;
  password: string;
  failedAttempts: number;
  locked: boolean;
  role?: Role;
};

export type ProfileDetails = Pick<Profile, "name" | "apellido" | "email" | "birthDate" | "direccion" | "genero" | "phone" | "region" | "comuna">;

export type Session = {
  name: string;
  apellido: string;
  email: string;
  birthDate: string;
  phone: string;
  role?: Role;
};

export type ProductoCatalogo = Producto & { description?: string; distributor?: string };

export type AppState = {
  products: ProductoCatalogo[];
  team: MiembroEquipo[];
  cart: CartItem[];
  cartQuantity: number;
  cartTotal: number;
  getQuantity: (code: string) => number;
  getStock: (code: string) => number;
  addToCart: (code: string) => boolean;
  changeQuantity: (code: string, amount: number) => void;
  removeFromCart: (code: string) => void;
  clearCart: () => void;
  checkout: (expectedCart: CartItem[]) => void;
  profiles: Profile[];
  // Registro e inicio de sesión contra la API (/api/v1/auth). Lanzan el error de axios
  // para que el formulario muestre los mensajes del backend (ver api/errores.ts).
  register: (datos: RegisterRequest) => Promise<void>;
  login: (email: string, password: string) => Promise<Role>;
  updateProfile: (details: ProfileDetails) => void;
  manageUser: (profile: Profile, originalEmail?: string) => void;
  deleteUser: (email: string) => void;
  categories: string[];
  saveProduct: (product: ProductoCatalogo) => void;
  deleteProduct: (id: string) => void;
  updateStock: (id: string, stock: number) => void;
  saveCategory: (name: string, previous?: string) => void;
  deleteCategory: (name: string) => void;
  session: Session | null;
  logout: () => Promise<void>;
};

export const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return context;
}
