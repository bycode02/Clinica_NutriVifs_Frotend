import { useEffect, useState } from "react";
import { Link } from "react-router";
import { mensajeDeError } from "../api/errores";
import { ListaBoletas } from "../components/ListaBoletas";
import { usePage } from "../hooks/usePage";
import { obtenerMisCompras } from "../services/boletaService";
import type { Boleta } from "../types/boleta";

// Historial de compras del usuario conectado (GET /api/v1/receipts/me).
// La API solo devuelve las boletas propias: nadie ve las de otro.
export default function MisCompras() {
  usePage("Mis compras | Clínica NutriDifs");
  const [boletas, setBoletas] = useState<Boleta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerMisCompras()
      .then(setBoletas)
      .catch((e) => setError(mensajeDeError(e, "No se pudieron cargar tus compras.")))
      .finally(() => setCargando(false));
  }, []);

  return (
    <main className="container py-4">
      <h1 className="h3 mb-4">Mis compras</h1>
      {cargando ? (
        <p role="status">Cargando tus compras...</p>
      ) : error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : (
        <>
          <ListaBoletas boletas={boletas} vacio="Todavía no tienes compras." />
          {!boletas.length && (
            <p className="text-center"><Link to="/productos">Ver productos</Link></p>
          )}
        </>
      )}
    </main>
  );
}
