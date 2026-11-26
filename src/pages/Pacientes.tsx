import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  actualizarPaciente,
  crearPaciente,
  eliminarPaciente,
  obtenerPacientes,
} from "../services/pacienteService";
import type { Paciente, PacienteForm } from "../types/paciente";
import PacienteTabla from "../components/PacienteTabla";
import { erroresDeCampos, mensajeDeError } from "../api/errores";
import { usePage } from "../hooks/usePage";

const VACIO = { name: "", species: "", breed: "", age: "", owner: "" };
type Campos = typeof VACIO;

// CRUD de pacientes contra /api/v1/patients (solo Administrador, ver RutaProtegida)
export default function Pacientes() {
  usePage("Pacientes | Clínica NutriDifs");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  // null = formulario cerrado; "nuevo" = crear; Paciente = editar
  const [editando, setEditando] = useState<Paciente | "nuevo" | null>(null);
  const [datos, setDatos] = useState<Campos>(VACIO);
  const [errores, setErrores] = useState<Partial<Campos>>({});
  const [guardando, setGuardando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<Paciente | null>(null);

  const cargarPacientes = useCallback(async () => {
    try {
      setPacientes(await obtenerPacientes());
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e, "Error al cargar pacientes"));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Desde un callback: el estado cambia cuando responde la API
    void Promise.resolve().then(cargarPacientes);
  }, [cargarPacientes]);

  const abrir = (paciente: Paciente | "nuevo") => {
    setEditando(paciente);
    setErrores({});
    setMensaje("");
    setDatos(paciente === "nuevo" ? VACIO : {
      name: paciente.name, species: paciente.species, breed: paciente.breed ?? "",
      age: String(paciente.age), owner: paciente.owner ?? "",
    });
  };

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    // Mismas reglas que la entidad Patient del backend
    const nuevos: Partial<Campos> = {};
    if (!datos.name.trim()) nuevos.name = "El nombre es obligatorio";
    if (!datos.species.trim()) nuevos.species = "La especie es obligatoria";
    if (!/^\d+$/.test(datos.age)) nuevos.age = "La edad debe ser un número entero mayor o igual a 0";
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    const form: PacienteForm = {
      name: datos.name.trim(), species: datos.species.trim(), breed: datos.breed.trim() || null,
      age: Number(datos.age), owner: datos.owner.trim() || null,
    };
    setGuardando(true);
    try {
      if (editando === "nuevo") await crearPaciente(form);
      else if (editando) await actualizarPaciente(editando.id, form);
      setMensaje(editando === "nuevo" ? "Paciente creado." : "Paciente actualizado.");
      setEditando(null);
      await cargarPacientes();
    } catch (e) {
      setErrores(erroresDeCampos(e) as Partial<Campos>);
      setMensaje(mensajeDeError(e, "No se pudo guardar el paciente."));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!porEliminar) return;
    try {
      await eliminarPaciente(porEliminar.id);
      setMensaje(`Paciente ${porEliminar.name} eliminado.`);
      await cargarPacientes();
    } catch (e) {
      setMensaje(mensajeDeError(e, "No se pudo eliminar el paciente."));
    } finally {
      setPorEliminar(null);
    }
  };

  const texto = busqueda.toLowerCase();
  const filtrados = pacientes.filter(
    (p) => p.name.toLowerCase().includes(texto) || p.species.toLowerCase().includes(texto),
  );

  const campo = (clave: keyof Campos, etiqueta: string, tipo = "text") => (
    <div className="col-md-4">
      <label className="form-label" htmlFor={`paciente-${clave}`}>{etiqueta}</label>
      <input
        id={`paciente-${clave}`}
        type={tipo}
        min={tipo === "number" ? 0 : undefined}
        className={`form-control${errores[clave] ? " is-invalid" : ""}`}
        value={datos[clave]}
        onChange={(e) => setDatos((d) => ({ ...d, [clave]: e.target.value }))}
      />
      {errores[clave] && <div className="invalid-feedback">{errores[clave]}</div>}
    </div>
  );

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Pacientes</h1>
        {!editando && (
          <button type="button" className="btn btn-primary" onClick={() => abrir("nuevo")}>
            Agregar paciente
          </button>
        )}
      </div>

      {mensaje && <div className="alert alert-info" role="status">{mensaje}</div>}

      {porEliminar && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center" role="alert">
          <span>¿Eliminar a {porEliminar.name}? Esta acción no se puede deshacer.</span>
          <span>
            <button type="button" className="btn btn-sm btn-danger me-2" onClick={() => void confirmarEliminar()}>
              Eliminar
            </button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPorEliminar(null)}>
              Cancelar
            </button>
          </span>
        </div>
      )}

      {editando && (
        <form className="card card-body mb-4" onSubmit={guardar} noValidate>
          <h2 className="h5">{editando === "nuevo" ? "Nuevo paciente" : `Editar a ${editando.name}`}</h2>
          <div className="row g-3">
            {campo("name", "Nombre")}
            {campo("species", "Especie")}
            {campo("breed", "Raza (opcional)")}
            {campo("age", "Edad (años)", "number")}
            {campo("owner", "Propietario (opcional)")}
          </div>
          <div className="mt-3">
            <button type="submit" className="btn btn-primary me-2" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditando(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <input
        type="search"
        className="form-control mb-3"
        placeholder="Buscar por nombre o especie..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {cargando ? (
        <div className="d-flex justify-content-center align-items-center gap-3 py-4" role="status">
          <div className="spinner-border text-primary" aria-hidden="true" />
          <span>Cargando pacientes...</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : (
        <PacienteTabla
          pacientes={filtrados}
          onEditar={(p) => abrir(p)}
          onEliminar={(p) => { setPorEliminar(p); setMensaje(""); }}
        />
      )}
    </div>
  );
}
