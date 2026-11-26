import axios from "axios";

// Formato de error del backend:
// { "status": 400, "message": "Hay datos inválidos", "errors": { "email": "Correo inválido..." } }
export interface ErrorApi {
  status: number;
  message: string;
  errors?: Record<string, string>;
}

function leerErrorApi(error: unknown): ErrorApi | null {
  if (axios.isAxiosError<ErrorApi>(error) && error.response?.data?.message) {
    return error.response.data;
  }
  return null;
}

// Mensaje para mostrar al usuario, sea cual sea el error
export function mensajeDeError(error: unknown, porDefecto = "Ocurrió un error. Intenta nuevamente."): string {
  const errorApi = leerErrorApi(error);
  if (errorApi) {
    return errorApi.message;
  }
  if (axios.isAxiosError(error)) {
    // Sin respuesta: backend apagado, sin red o timeout
    if (!error.response) {
      return "No se pudo conectar con el servidor. Revisa que el backend esté encendido.";
    }
  }
  return porDefecto;
}

// Errores por campo de los formularios (ej. { email: "...", password: "..." }).
// Los nombres de campo son los del backend; con "nombres" se traducen a los del formulario.
export function erroresDeCampos(
  error: unknown,
  nombres: Record<string, string> = {},
): Record<string, string> {
  const errores = leerErrorApi(error)?.errors ?? {};
  return Object.fromEntries(
    Object.entries(errores).map(([campo, mensaje]) => [nombres[campo] ?? campo, mensaje]),
  );
}

// Código HTTP del error (ej. 409), o null si no hubo respuesta
export function estadoDeError(error: unknown): number | null {
  return axios.isAxiosError(error) ? (error.response?.status ?? null) : null;
}
