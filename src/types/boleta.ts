// Tipos de /api/v1/receipts (boletas) y /api/v1/reports

// Una línea del carrito al confirmar la compra.
// price es el precio que vio el cliente: si cambió, el backend rechaza la compra (409).
export interface ItemCompra {
  productId: string;
  quantity: number;
  price: number;
}

export interface DetalleBoleta {
  productId: string;
  productName: string;
  categoryName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Boleta {
  id: number;
  // Número visible, ej. "B-000042"
  number: string;
  // Fecha ISO en UTC, ej. "2026-11-26T03:03:59Z"
  createdAt: string;
  customerName: string;
  customerEmail: string;
  // netAmount + taxAmount = total (IVA 19% incluido)
  netAmount: number;
  taxAmount: number;
  total: number;
  itemCount: number;
  details: DetalleBoleta[];
}

// Filtro de fechas (yyyy-MM-dd, ambos días incluidos). Sin fechas: últimos 30 días.
export interface RangoFechas {
  from?: string;
  to?: string;
}

export interface ReporteVentas {
  from: string;
  to: string;
  totalSales: number;
  receiptCount: number;
  averageTicket: number;
  itemsSold: number;
  customerCount: number;
  salesByDay: { date: string; total: number; receipts: number }[];
  topProducts: { productId: string; productName: string; quantity: number; revenue: number }[];
  salesByCategory: { categoryName: string; quantity: number; revenue: number }[];
  lowStockThreshold: number;
  lowStock: { productId: string; productName: string; stock: number }[];
}
