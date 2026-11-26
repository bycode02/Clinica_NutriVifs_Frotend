import { useCallback, useEffect, useState, type ReactNode } from "react";
import { EQUIPO_INICIAL, type MiembroEquipo } from "../data/equipo";
import { imagenProducto } from "../data/productos";
import { STORAGE_KEYS, loadObject, remove, save } from "../utils/storage";
import { validarRegistro, INICIAL } from "../utils/registro";
import { normalizeEmail } from "../utils/validaciones";
import { requireRole, validateProduct, validateStock, normalizeCategory } from "../utils/administracion";
import { AppContext, type AppState, type CartItem, type Profile, type ProfileDetails, type ProductoCatalogo, type Session, type Role } from "./AppContext";
import { SESION_EXPIRADA } from "../api/axiosConfig";
import { mensajeDeError } from "../api/errores";
import { obtenerToken } from "../api/tokenStorage";
import { cerrarSesion, iniciarSesion, registrarse } from "../services/authService";
import { actualizarCategoria, crearCategoria, eliminarCategoria, obtenerCategorias } from "../services/categoriaService";
import { actualizarProducto, actualizarStock, crearProducto, eliminarProducto, obtenerProductos } from "../services/productoService";
import { comprar } from "../services/boletaService";
import { actualizarMiPerfil, actualizarUsuario, crearUsuario, eliminarUsuario, obtenerMiPerfil, obtenerUsuarios } from "../services/usuarioService";
import type { AuthResponse, RegisterRequest } from "../types/auth";
import type { Categoria, Producto } from "../types/producto";
import { perfilDesdeApi, rolDesdeApi, sesionDesdeApi, usuarioHaciaApi } from "../utils/roles";
import { loginConRetorno } from "../utils/redireccion";

// Producto de la API -> forma que usan las páginas (categoría como nombre)
function productoDesdeApi(p: Producto): ProductoCatalogo {
  return {
    id: p.id, name: p.name, category: p.category.name, price: p.price, stock: p.stock,
    image: p.image ?? "", activeIngredient: p.activeIngredient ?? "", species: p.species ?? "",
    description: p.description ?? undefined, distributor: p.distributor,
  };
}

// Código para un producto nuevo: siguiente ME### libre
function siguienteCodigo(products: ProductoCatalogo[]): string {
  const max = products.reduce((n, p) => Math.max(n, Number(/^ME(\d+)$/.exec(p.id)?.[1] ?? 0)), 0);
  return `ME${String(max + 1).padStart(3, "0")}`;
}

function loadCart(): CartItem[] {
  const saved = loadObject<unknown>(STORAGE_KEYS.CART) ?? loadObject<unknown>(STORAGE_KEYS.LEGACY_CART);
  if (!Array.isArray(saved)) return [];
  return saved
    .filter((item) => item && Number(item.quantity) > 0)
    .map((item) => ({
      code: String(item.code || item.id || ""),
      name: item.name || "Producto",
      price: Number(item.price) || 0,
      image: item.image || "",
      quantity: Number(item.quantity) || 1,
    }))
    .filter((item) => item.code);
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Catálogo: viene de la API (/products y /categories)
  const [products, setProducts] = useState<ProductoCatalogo[]>([]);
  const [categoriasApi, setCategoriasApi] = useState<Categoria[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const categories = categoriasApi.map((c) => c.name);
  // Usuarios: el Admin ve todos; el resto, solo su propio perfil (/users/me)
  const [profiles, setProfiles] = useState<Profile[]>([]);
  // La sesión se restaura al recargar solo si todavía hay token
  const [session, setSession] = useState<Session | null>(() => {
    const stored = loadObject<Session>(STORAGE_KEYS.SESSION);
    return stored && obtenerToken() ? stored : null;
  });
  // El carrito se queda en el navegador; el stock y el precio los valida la API al comprar
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [team] = useState(() => (loadObject<MiembroEquipo[]>(STORAGE_KEYS.ADMIN_USERS) ?? EQUIPO_INICIAL).filter(user => user.status !== "Inactivo"));
  useEffect(() => { save(STORAGE_KEYS.CART, cart); }, [cart]);

  // Ajusta el carrito al catálogo vigente (precio, nombre y stock disponibles)
  const syncCart = useCallback((next: ProductoCatalogo[]) => {
    setCart(current => current.flatMap(item => {
      const product = next.find(p => p.id === item.code);
      return product && product.stock > 0 ? [{ ...item, name: product.name, price: product.price, quantity: Math.min(item.quantity, product.stock) }] : [];
    }));
  }, []);

  const reloadCatalog = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([obtenerProductos(), obtenerCategorias()]);
      const next = prods.map(productoDesdeApi);
      setProducts(next);
      setCategoriasApi(cats);
      setCatalogError("");
      syncCart(next);
    } catch (error) {
      setCatalogError(mensajeDeError(error, "No se pudo cargar el catálogo."));
    } finally {
      setCatalogLoading(false);
    }
  }, [syncCart]);
  // Carga inicial del catálogo (desde un callback: el estado cambia cuando responde la API)
  useEffect(() => { void Promise.resolve().then(reloadCatalog); }, [reloadCatalog]);

  const reloadProfiles = useCallback(async (role?: Role) => {
    if (!role) { setProfiles([]); return; }
    try {
      const users = role === "Administrador" ? await obtenerUsuarios() : [await obtenerMiPerfil()];
      setProfiles(users.map(perfilDesdeApi));
    } catch {
      setProfiles([]);
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(() => reloadProfiles(session?.role)); }, [session?.role, session?.email, reloadProfiles]);

  // ---- Sesión con la API ----
  const startApiSession = (auth: AuthResponse) => {
    const next = sesionDesdeApi(auth);
    save(STORAGE_KEYS.SESSION, next);
    setSession(next);
  };
  const clearSession = useCallback(() => {
    setSession(null);
    remove(STORAGE_KEYS.SESSION);
  }, []);
  const logout = async () => {
    await cerrarSesion().catch(() => undefined);
    clearSession();
  };
  // Si el token venció y no se pudo renovar: cerrar sesión y volver al login
  useEffect(() => {
    const onExpired = () => {
      clearSession();
      const actual = window.location.pathname + window.location.search;
      if (!actual.startsWith("/login")) window.location.assign(loginConRetorno(actual));
    };
    window.addEventListener(SESION_EXPIRADA, onExpired);
    return () => window.removeEventListener(SESION_EXPIRADA, onExpired);
  }, [clearSession]);
  const register = async (datos: RegisterRequest) => {
    startApiSession(await registrarse(datos));
  };
  const login = async (email: string, password: string): Promise<Role> => {
    const auth = await iniciarSesion({ email: normalizeEmail(email), password });
    startApiSession(auth);
    return rolDesdeApi(auth.role);
  };

  // ---- Usuarios (Admin) y perfil propio ----
  const manageUser = async (profile: Profile, originalEmail?: string) => {
    requireRole(session?.role, ["Administrador"]);
    const datos = usuarioHaciaApi({ ...profile, email: normalizeEmail(profile.email) });
    if (originalEmail) await actualizarUsuario(originalEmail, datos);
    else await crearUsuario(datos);
    await reloadProfiles(session?.role);
  };
  const deleteUser = async (email: string) => {
    requireRole(session?.role, ["Administrador"]);
    await eliminarUsuario(email);
    if (email === session?.email) await logout();
    else await reloadProfiles(session?.role);
  };
  const updateProfile = async (details: ProfileDetails) => {
    const current = profiles.find(p => p.email === session?.email);
    if (!session || !current) throw new Error("Inicia sesión para editar tu perfil.");
    const next: Profile = { ...current, ...details, phone: details.phone === "+" ? "" : details.phone };
    const errors = validarRegistro({ ...INICIAL, ...next }, true, current.apellido === "");
    const error = Object.values(errors).find(Boolean);
    if (error) throw new Error(error);
    // El correo no se cambia desde el perfil (identifica la sesión)
    const updated = perfilDesdeApi(await actualizarMiPerfil(usuarioHaciaApi({ ...next, email: session.email, password: "" })));
    const nextSession = { ...session, name: updated.name, apellido: updated.apellido, birthDate: updated.birthDate, phone: updated.phone };
    save(STORAGE_KEYS.SESSION, nextSession);
    setSession(nextSession);
    await reloadProfiles(session.role);
  };

  // ---- Productos y categorías (API) ----
  const categoryId = (name: string) => {
    const found = categoriasApi.find(c => c.name === name);
    if (!found) throw new Error("Selecciona una categoría válida.");
    return found.id;
  };
  const saveProduct = async (product: ProductoCatalogo) => {
    requireRole(session?.role, ["Administrador", "Vendedor"]);
    const exists = products.some(p => p.id === product.id);
    validateProduct(product, categories, !exists);
    const datos = {
      id: exists ? product.id : siguienteCodigo(products),
      name: product.name.trim(), distributor: (product.distributor ?? "").trim(),
      description: product.description || undefined, price: product.price, stock: product.stock,
      image: product.image || undefined, activeIngredient: product.activeIngredient || undefined,
      species: product.species || undefined, categoryId: categoryId(product.category),
    };
    if (exists) await actualizarProducto(product.id, datos);
    else await crearProducto(datos);
    await reloadCatalog();
  };
  const deleteProduct = async (id: string) => {
    requireRole(session?.role, ["Administrador"]);
    await eliminarProducto(id);
    await reloadCatalog();
  };
  const updateStock = async (id: string, stock: number) => {
    requireRole(session?.role, ["Administrador", "Vendedor"]);
    validateStock(stock);
    await actualizarStock(id, stock);
    await reloadCatalog();
  };
  const saveCategory = async (name: string, previous?: string) => {
    requireRole(session?.role, ["Administrador"]);
    const next = normalizeCategory(name);
    if (previous) await actualizarCategoria(categoryId(previous), next);
    else await crearCategoria(next);
    await reloadCatalog();
  };
  const deleteCategory = async (name: string) => {
    requireRole(session?.role, ["Administrador"]);
    await eliminarCategoria(categoryId(name));
    await reloadCatalog();
  };

  // ---- Carrito ----
  const getStock = useCallback(
    (code: string) => Number(products.find((product) => product.id === code)?.stock ?? 0),
    [products],
  );
  const getQuantity = useCallback(
    (code: string) => cart.find((item) => item.code === code)?.quantity ?? 0,
    [cart],
  );
  const addToCart = useCallback(
    (code: string) => {
      const product = products.find((item) => item.id === code);
      if (!product || product.stock <= 0) return false;
      if (getQuantity(code) >= product.stock) return false;
      setCart((current) => {
        const existing = current.find((item) => item.code === code);
        if ((existing?.quantity || 0) >= product.stock) return current;
        if (existing) {
          return current.map((item) => item.code === code ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...current, { code, name: product.name, price: product.price, image: imagenProducto(product.image), quantity: 1 }];
      });
      return true;
    },
    [products, getQuantity],
  );
  const changeQuantity = useCallback(
    (code: string, amount: number) => {
      setCart((current) => {
        const item = current.find((entry) => entry.code === code);
        if (!item) return current;
        const stock = getStock(code);
        if (amount > 0 && item.quantity >= stock) return current;
        const quantity = Math.min(item.quantity + amount, stock);
        if (quantity <= 0) return current.filter((entry) => entry.code !== code);
        return current.map((entry) => entry.code === code ? { ...entry, quantity } : entry);
      });
    },
    [getStock],
  );
  const removeFromCart = useCallback((code: string) => {
    setCart((current) => current.filter((item) => item.code !== code));
  }, []);
  const clearCart = useCallback(() => setCart([]), []);

  // Compra en la API: valida stock y precio, descuenta y crea la boleta.
  // Si falla (ej. 409 sin stock o precio cambiado) se recarga el catálogo para ajustar el carrito.
  const checkout = async (expectedCart: CartItem[]) => {
    if (!session) throw new Error("Debes iniciar sesión para comprar.");
    if (!expectedCart.length) throw new Error("El carrito está vacío o la compra ya fue confirmada.");
    try {
      const boleta = await comprar(expectedCart.map(item => ({ productId: item.code, quantity: item.quantity, price: item.price })));
      setCart([]);
      await reloadCatalog();
      return boleta;
    } catch (error) {
      await reloadCatalog();
      throw error;
    }
  };

  const value: AppState = { products, categories, team, cart, cartQuantity: cart.reduce((n, p) => n + p.quantity, 0), cartTotal: cart.reduce((n, p) => n + p.price * p.quantity, 0), getQuantity, getStock, addToCart, changeQuantity, removeFromCart, clearCart, checkout, reloadCatalog, catalogLoading, catalogError, profiles, session, register, login, updateProfile, manageUser, deleteUser, saveProduct, deleteProduct, updateStock, saveCategory, deleteCategory, logout };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
