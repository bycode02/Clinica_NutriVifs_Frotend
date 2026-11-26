import { api } from "../api/axiosConfig";
import type { Boleta, ItemCompra, RangoFechas } from "../types/boleta";

// Compras y boletas: /api/v1/receipts (requiere sesión iniciada)

// Confirma la compra del carrito: descuenta stock y devuelve la boleta.
// Errores 409: sin stock, precio cambiado o producto que ya no existe.
export async function comprar(items: ItemCompra[]): Promise<Boleta> {
  const respuesta = await api.post<Boleta>("/receipts", { items });
  return respuesta.data;
}

// Historial de compras del usuario conectado
export async function obtenerMisCompras(): Promise<Boleta[]> {
  const respuesta = await api.get<Boleta[]>("/receipts/me");
  return respuesta.data;
}

// Una boleta: su dueño, o Vendedor y Administrador
export async function obtenerBoleta(id: number): Promise<Boleta> {
  const respuesta = await api.get<Boleta>(`/receipts/${id}`);
  return respuesta.data;
}

// Todas las ventas del período (Vendedor y Administrador)
export async function obtenerVentas(rango: RangoFechas = {}): Promise<Boleta[]> {
  const respuesta = await api.get<Boleta[]>("/receipts", { params: rango });
  return respuesta.data;
}
