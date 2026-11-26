import { api } from "../api/axiosConfig";
import type { RangoFechas, ReporteVentas } from "../types/boleta";

// Reportes del dashboard: /api/v1/reports (solo Administrador)

// Fechas yyyy-MM-dd, ambos días incluidos. Sin fechas: últimos 30 días.
export async function obtenerReporteVentas(rango: RangoFechas = {}): Promise<ReporteVentas> {
  const respuesta = await api.get<ReporteVentas>("/reports/sales", { params: rango });
  return respuesta.data;
}
