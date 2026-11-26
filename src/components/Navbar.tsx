import { Link, NavLink } from "react-router";
import { useApp, type Role } from "../context/AppContext";

type Enlace = { to: string; label: string };

const LINKS: Enlace[] = [
  { to: "/", label: "Inicio" },
  { to: "/consultas", label: "Consultas" },
  { to: "/productos", label: "Productos" },
  { to: "/blog", label: "Blog" },
  { to: "/contactanos", label: "Contáctanos" },
  { to: "/quienes-somos", label: "Quiénes somos" },
];

// Enlaces extra según el rol (las mismas rutas que protege <RutaProtegida> en App.tsx)
const LINKS_POR_ROL: Record<Role, Enlace[]> = {
  Administrador: [
    { to: "/administrar", label: "Administrar" },
    { to: "/pacientes", label: "Pacientes" },
  ],
  Vendedor: [{ to: "/vendedor", label: "Panel vendedor" }],
  Cliente: [],
};

export const Navbar = () => {
  const { session, cartQuantity } = useApp();
  const links = [...LINKS, ...(session ? LINKS_POR_ROL[session.role ?? "Cliente"] : [])];

  return (
    <header className="site-header">
      <div className="container header-content">
        <Link className="brand" to="/">
          Clínica NutriDifs
        </Link>

        <nav aria-label="Navegación principal">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Sin sesión el enlace lleva directo al login (Perfil pide sesión) */}
        <Link className="profile-link" to={session ? "/perfil" : "/login"}>
          {session ? `Perfil (${session.name})` : "Iniciar sesión"}
        </Link>

        <Link
          className="carrito-compras"
          to="/carrito"
          aria-label={`Carrito, ${cartQuantity} productos`}
        >
          Carrito <span className="cart-counter">{cartQuantity}</span>
        </Link>
      </div>
    </header>
  );
};
