import { useState } from "react";
import type { Boleta } from "../types/boleta";
import { formatCurrency } from "../utils/format";

interface ListaBoletasProps {
  boletas: Boleta[];
  // En Ventas se muestra quién compró; en Mis compras no hace falta
  mostrarCliente?: boolean;
  vacio?: string;
}

// La fecha viene en UTC: se muestra en hora de Chile
const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

// Lista de boletas; cada una se abre para ver su detalle (productos, neto, IVA y total)
export function ListaBoletas({ boletas, mostrarCliente = false, vacio = "No hay boletas." }: ListaBoletasProps) {
  const [abierta, setAbierta] = useState<number | null>(null);

  if (!boletas.length) {
    return <p className="text-muted text-center py-4">{vacio}</p>;
  }

  return (
    <div className="list-group">
      {boletas.map((b) => (
        <div className="list-group-item" key={b.id}>
          <button
            type="button"
            className="btn w-100 text-start d-flex flex-wrap justify-content-between align-items-center gap-2 p-0"
            aria-expanded={abierta === b.id}
            onClick={() => setAbierta(abierta === b.id ? null : b.id)}
          >
            <span>
              <strong>{b.number}</strong>
              <span className="text-muted ms-2">{fecha(b.createdAt)}</span>
              {mostrarCliente && <span className="ms-2">· {b.customerName} ({b.customerEmail})</span>}
            </span>
            <span>
              {b.itemCount} {b.itemCount === 1 ? "producto" : "productos"} · <strong>{formatCurrency(b.total)}</strong>
              <span className="ms-2" aria-hidden="true">{abierta === b.id ? "▲" : "▼"}</span>
            </span>
          </button>

          {abierta === b.id && (
            <div className="table-responsive mt-3">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th className="text-end">Precio</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {b.details.map((d) => (
                    <tr key={d.productId}>
                      <td>{d.productName} <small className="text-muted">({d.productId})</small></td>
                      <td>{d.categoryName}</td>
                      <td className="text-end">{formatCurrency(d.unitPrice)}</td>
                      <td className="text-end">{d.quantity}</td>
                      <td className="text-end">{formatCurrency(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={4} className="text-end">Neto</td><td className="text-end">{formatCurrency(b.netAmount)}</td></tr>
                  <tr><td colSpan={4} className="text-end">IVA (19%)</td><td className="text-end">{formatCurrency(b.taxAmount)}</td></tr>
                  <tr><th colSpan={4} className="text-end">Total</th><th className="text-end">{formatCurrency(b.total)}</th></tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
