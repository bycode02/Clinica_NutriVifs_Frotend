// Mismos campos que la entidad Patient del backend (/api/v1/patients)
export interface Paciente {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  age: number;
  owner: string | null;
}
