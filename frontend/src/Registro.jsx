import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth, erroresPorCampo } from "./Auth.jsx";
import { validarRegistro } from "./validaciones.js";
import Campo from "./Campo.jsx";

function Registro() {
  const { registro, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nombre: "", email: "", password: "", confirmar: "" });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (isAuthenticated) return <Navigate to="/vehiculos" replace />;

  const cambiar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrores({ ...errores, [e.target.name]: undefined });
  };

  const enviar = async (e) => {
    e.preventDefault();
    setMensaje("");
    const nuevosErrores = validarRegistro(form);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      await registro(form.nombre.trim(), form.email.trim(), form.password);
      navigate("/vehiculos", { replace: true });
    } catch (error) {
      setErrores(erroresPorCampo(error));
      setMensaje(error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="panel panel-angosto">
      <h1>Crear cuenta</h1>
      {mensaje && <p className="alerta alerta-error">{mensaje}</p>}
      <form onSubmit={enviar} noValidate className="formulario">
        <Campo label="Nombre" error={errores.nombre}>
          <input name="nombre" value={form.nombre} onChange={cambiar} autoComplete="name" />
        </Campo>
        <Campo label="Email" error={errores.email}>
          <input type="email" name="email" value={form.email} onChange={cambiar} autoComplete="email" />
        </Campo>
        <Campo label="Contraseña" error={errores.password}>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={cambiar}
            autoComplete="new-password"
          />
        </Campo>
        <Campo label="Repetir contraseña" error={errores.confirmar}>
          <input
            type="password"
            name="confirmar"
            value={form.confirmar}
            onChange={cambiar}
            autoComplete="new-password"
          />
        </Campo>
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? "Registrando..." : "Registrarse"}
        </button>
      </form>
      <p className="texto-secundario">
        ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </section>
  );
}

export default Registro;
