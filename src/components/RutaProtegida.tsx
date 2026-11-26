import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useApp, type Role } from "../context/AppContext";
import { routeForRole } from "../data/defaultAdmin";
import { usePage } from "../hooks/usePage";
import { loginConRetorno } from "../utils/redireccion";

interface RutaProtegidaProps {
  // Roles que pueden entrar. Sin "roles": basta con haber iniciado sesión.
  roles?: Role[];
  children: ReactNode;
}

// Protege una página según la sesión y el rol.
// - Sin sesión: manda al login y, después de ingresar, vuelve a esta misma página.
// - Con sesión pero sin el rol: muestra "No tienes permiso".
// Es solo para la pantalla: la API vuelve a revisar el rol en cada petición (401/403).
export function RutaProtegida({ roles, children }: RutaProtegidaProps) {
  const { session } = useApp();
  const { pathname, search } = useLocation();

  if (!session) {
    return <Navigate to={loginConRetorno(pathname + search)} replace />;
  }
  const rol = session.role ?? "Cliente";
  if (roles && !roles.includes(rol)) {
    return <SinPermiso rol={rol} />;
  }
  return <>{children}</>;
}

function SinPermiso({ rol }: { rol: Role }) {
  usePage("Sin permiso | Clínica NutriDifs");
  return (
    <main className="container py-5 text-center">
      <h1 className="h3 mb-3">No tienes permiso para ver esta página</h1>
      <p className="text-muted mb-4">
        Tu cuenta es de tipo <strong>{rol}</strong>. Si crees que es un error, contacta a un administrador.
      </p>
      <Link className="btn btn-primary" to={routeForRole(rol)} replace>
        Ir a mi inicio
      </Link>
    </main>
  );
}
