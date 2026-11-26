import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { rutaDeRetorno } from "../utils/redireccion";
import { mensajeDeError } from "../api/errores";
import { useApp } from "../context/AppContext";
import { routeForRole } from "../data/defaultAdmin";
import { usePage } from "../hooks/usePage";
import {
  MENSAJES,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from "../utils/validaciones";



export const Login = () => {
  usePage("Iniciar sesión | Clínica NutriDifs", "auth-page");
  const { login } = useApp();
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  // Ej. /login?redirect=/carrito: después de ingresar se vuelve al carrito
  const [searchParams] = useSearchParams();
  const retorno = rutaDeRetorno(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setEmailError("");
    setPasswordError("");
    setMessage("");

    const correo = normalizeEmail(email);

    if (correo.length > 100 || !isValidEmail(correo)) {
      setEmailError(
        "El correo debe terminar en @duoc.cl, @profesor.duoc.cl o @gmail.com.",
      );
      return;
    }

    if (!isValidPassword(password)) {
      setPasswordError(MENSAJES.password);
      return;
    }

    setEnviando(true);
    try {
      const role = await login(correo, password);
      navigate(retorno ?? routeForRole(role), { replace: true });
    } catch (error) {
      // Mensaje del backend: "Correo o contraseña incorrectos", "Cuenta bloqueada por 3 intentos...", etc.
      setMessage(mensajeDeError(error, "No se pudo iniciar sesión."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="auth-shell">
      <Link className="auth-brand" to="/">
        Clínica NutriDifs
      </Link>
      <p className="auth-kicker">Acceso de usuarios</p>
      <h1 className="auth-title">Iniciar sesión</h1>
      <p className="auth-subtitle">
        {retorno === "/carrito"
          ? "Ingresa para terminar tu compra. Tu carrito sigue guardado."
          : "Ingresa para continuar con tus solicitudes y reservas."}
      </p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="email">Correo electrónico</label>
          <input className="form-control"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="auth-field-error" role="alert">
            {emailError}
          </p>
        </div>
        <div className="auth-field">
          <label htmlFor="password">Contraseña</label>
          <input className="form-control"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="auth-field-error" role="alert">
            {passwordError}
          </p>
        </div>
        <p className="auth-message" aria-live="polite">
          {message}
        </p>
        <button className="btn auth-button" type="submit" disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <nav className="auth-links" aria-label="Opciones de acceso">
        <Link to={retorno ? `/registro?redirect=${encodeURIComponent(retorno)}` : "/registro"}>
          Crear una cuenta
        </Link>
        <Link to="/">Volver al inicio</Link>
      </nav>
    </main>
  );
};
