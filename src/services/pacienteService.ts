import { api } from "../api/axiosConfig";
import type { Paciente, PacienteForm } from "../types/paciente";

// CRUD de pacientes: /api/v1/patients (solo Administrador)

export async function obtenerPacientes(): Promise<Paciente[]> {
  const respuesta = await api.get<Paciente[]>("/patients");
  return respuesta.data;
}

export async function obtenerPaciente(id: number): Promise<Paciente> {
  const respuesta = await api.get<Paciente>(`/patients/${id}`);
  return respuesta.data;
}

export async function crearPaciente(paciente: PacienteForm): Promise<Paciente> {
  const respuesta = await api.post<Paciente>("/patients", paciente);
  return respuesta.data;
}

export async function actualizarPaciente(id: number, paciente: PacienteForm): Promise<Paciente> {
  const respuesta = await api.put<Paciente>(`/patients/${id}`, paciente);
  return respuesta.data;
}

export async function eliminarPaciente(id: number): Promise<void> {
  await api.delete(`/patients/${id}`);
}
