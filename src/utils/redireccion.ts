// Página a la que volver después de iniciar sesión, enviada como ?redirect=/carrito.
// Solo se aceptan rutas internas ("/algo"), para que un enlace no pueda mandar al
// usuario a otro sitio después del login (ej. ?redirect=//sitio-falso.com).
export function rutaDeRetorno(valor: string | null): string | null {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) {
    return null;
  }
  return valor;
}

export function loginConRetorno(ruta: string) {
  return `/login?redirect=${encodeURIComponent(ruta)}`;
}
