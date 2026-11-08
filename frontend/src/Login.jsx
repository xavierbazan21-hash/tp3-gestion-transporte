import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth, erroresPorCampo } from "./Auth.jsx";
import { validarLogin } from "./validaciones.js";
import Campo from "./Campo.jsx";

function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.desde ?? "/vehiculos";

  const [form, setForm] = useState({ email: "", password: "" });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (isAuthenticated) return <Navigate to={destino} replace />;

  const cambiar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrores({ ...errores, [e.target.name]: undefined });
  };

  const enviar = async (e) => {
    e.preventDefault();
    setMensaje("");
    const nuevosErrores = validarLogin(form);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(destino, { replace: true });
    } catch (error) {
      setErrores(erroresPorCampo(error));
      setMensaje(error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="panel panel-angosto">
      <h1>Iniciar sesión</h1>
      {location.state?.desde && !mensaje && (
        <p className="alerta alerta-info">Inicie sesión para acceder a esa sección.</p>
      )}
      {mensaje && <p className="alerta alerta-error">{mensaje}</p>}
      <form onSubmit={enviar} noValidate className="formulario">
        <Campo label="Email" error={errores.email}>
          <input type="email" name="email" value={form.email} onChange={cambiar} autoComplete="email" />
        </Campo>
        <Campo label="Contraseña" error={errores.password}>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={cambiar}
            autoComplete="current-password"
          />
        </Campo>
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <p className="texto-secundario">
        ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
      </p>
    </section>
  );
}

export default Login;
