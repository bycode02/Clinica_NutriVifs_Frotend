import type { Paciente } from "../types/paciente";

interface PacienteTablaProps {
  pacientes: Paciente[];
}

export default function PacienteTabla({ pacientes }: PacienteTablaProps) {
  return (
    <table className="table table-striped table-hover">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Especie</th>
          <th>Raza</th>
          <th>Edad</th>
          <th>Propietario</th>
        </tr>
      </thead>
      <tbody>
        {pacientes.length === 0 ? (
          <tr>
            <td colSpan={5} className="text-center text-muted">
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
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}