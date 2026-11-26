import { api } from "../api/axiosConfig";
import type { Paciente } from "../types/paciente";

export async function obtenerPacientes(): Promise<Paciente[]> {
  const respuesta = await api.get<Paciente[]>("/api/v1/patients");
  return respuesta.data;
}

