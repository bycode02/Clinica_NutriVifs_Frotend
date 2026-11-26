import { useEffect, useState, type FormEvent } from "react";
import { mensajeDeError } from "../api/errores";
import { ListaBoletas } from "../components/ListaBoletas";
import { usePage } from "../hooks/usePage";
import { obtenerVentas } from "../services/boletaService";
import type { Boleta, RangoFechas } from "../types/boleta";
import { formatCurrency } from "../utils/format";

// yyyy-MM-dd en hora de Chile, como espera la API
const hoyChile = (restarDias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - restarDias);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
};

// Ventas del período (GET /api/v1/receipts?from=&to=): Vendedor y Administrador
export default function Ordenes() {
  usePage("Ventas | Clínica NutriDifs");
  // Por defecto, los últimos 30 días (igual que la API)
  const [rango, setRango] = useState<Required<RangoFechas>>({ from: hoyChile(29), to: hoyChile() });
  const [filtro, setFiltro] = useState(rango);
  const [boletas, setBoletas] = useState<Boleta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    obtenerVentas(rango)
      .then((data) => { if (vigente) { setBoletas(data); setError(""); } })
      .catch((e) => { if (vigente) setError(mensajeDeError(e, "No se pudieron cargar las ventas.")); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [rango]);

  const buscar = (event: FormEvent) => {
    event.preventDefault();
    setCargando(true);
    setRango(filtro);
  };

  const total = boletas.reduce((n, b) => n + b.total, 0);
  const unidades = boletas.reduce((n, b) => n + b.itemCount, 0);

  return (
    <main className="container py-4">
      <h1 className="h3 mb-4">Ventas</h1>

      <form className="row g-2 align-items-end mb-4" onSubmit={buscar}>
        <div className="col-auto">
          <label className="form-label" htmlFor="ventas-desde">Desde</label>
          <input id="ventas-desde" type="date" className="form-control" value={filtro.from} max={filtro.to}
            onChange={(e) => setFiltro((f) => ({ ...f, from: e.target.value }))} />
        </div>
        <div className="col-auto">
          <label className="form-label" htmlFor="ventas-hasta">Hasta</label>
          <input id="ventas-hasta" type="date" className="form-control" value={filtro.to} min={filtro.from}
            onChange={(e) => setFiltro((f) => ({ ...f, to: e.target.value }))} />
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary">Buscar</button>
        </div>
      </form>

      {cargando ? (
        <p role="status">Cargando ventas...</p>
      ) : error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : (
        <>
          <p className="mb-3">
            <strong>{boletas.length}</strong> {boletas.length === 1 ? "boleta" : "boletas"} ·{" "}
            <strong>{unidades}</strong> unidades · Total <strong>{formatCurrency(total)}</strong>
          </p>
          <ListaBoletas boletas={boletas} mostrarCliente vacio="No hay ventas en este período." />
        </>
      )}
    </main>
  );
}
