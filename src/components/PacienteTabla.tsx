import type { Paciente } from "../types/paciente";

interface PacienteTablaProps {
  pacientes: Paciente[];
  // Opcionales: si vienen, se muestran los botones de cada fila
  onEditar?: (paciente: Paciente) => void;
  onEliminar?: (paciente: Paciente) => void;
}

export default function PacienteTabla({ pacientes, onEditar, onEliminar }: PacienteTablaProps) {
  const conAcciones = !!(onEditar || onEliminar);
  const columnas = conAcciones ? 6 : 5;
  return (
    <table className="table table-striped table-hover">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Especie</th>
          <th>Raza</th>
          <th>Edad</th>
          <th>Propietario</th>
          {conAcciones && <th>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {pacientes.length === 0 ? (
          <tr>
            <td colSpan={columnas} className="text-center text-muted">
              No hay pacientes registrados.
            </td>
          </tr>
        ) : (
          pacientes.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.species}</td>
              <td>{p.breed}</td>
              <td>{p.age}</td>
              <td>{p.owner}</td>
              {conAcciones && (
                <td className="text-nowrap">
                  {onEditar && (
                    <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => onEditar(p)}>
                      Editar
                    </button>
                  )}
                  {onEliminar && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onEliminar(p)}>
                      Eliminar
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
