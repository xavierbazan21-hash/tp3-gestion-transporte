import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth, erroresPorCampo } from "./Auth.jsx";
import { validarConductor } from "./validaciones.js";
import { formatearFecha, formatearKm } from "./formato.js";
import Campo from "./Campo.jsx";

const CONDUCTOR_VACIO = {
  nombre: "",
  apellido: "",
  dni: "",
  numero_licencia: "",
  fecha_alta_licencia: "",
  fecha_vencimiento_licencia: "",
};

// Estado de la licencia según la fecha de vencimiento
const estadoLicencia = (vencimiento) => {
  const hoy = new Date();
  const fechaHoy = hoy.toISOString().slice(0, 10);
  const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (vencimiento < fechaHoy) return { clase: "estado-vencida", texto: "Vencida" };
  if (vencimiento <= en30Dias) return { clase: "estado-por-vencer", texto: "Por vencer" };
  return { clase: "estado-vigente", texto: "Vigente" };
};

function Conductores() {
  const { fetchAuth } = useAuth();
  const [conductores, setConductores] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const [form, setForm] = useState(CONDUCTOR_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(
    async (texto = "") => {
      setCargando(true);
      try {
        const consulta = texto ? `?buscar=${encodeURIComponent(texto)}` : "";
        const { data } = await fetchAuth(`/conductores${consulta}`);
        setConductores(data);
      } catch (error) {
        setMensaje({ tipo: "error", texto: error.message });
      } finally {
        setCargando(false);
      }
    },
    [fetchAuth]
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setForm(CONDUCTOR_VACIO);
    setEditandoId(null);
    setErrores({});
    setMostrarForm(true);
  };

  const abrirEdicion = (conductor) => {
    setForm({
      nombre: conductor.nombre,
      apellido: conductor.apellido,
      dni: conductor.dni,
      numero_licencia: conductor.numero_licencia,
      fecha_alta_licencia: conductor.fecha_alta_licencia,
      fecha_vencimiento_licencia: conductor.fecha_vencimiento_licencia,
    });
    setEditandoId(conductor.id);
    setErrores({});
    setMostrarForm(true);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setEditandoId(null);
    setErrores({});
  };

  const cambiar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrores({ ...errores, [e.target.name]: undefined });
  };

  const guardar = async (e) => {
    e.preventDefault();
    const nuevosErrores = validarConductor(form);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const datos = {
      ...form,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      dni: form.dni.trim(),
      numero_licencia: form.numero_licencia.trim().toUpperCase(),
    };

    setEnviando(true);
    try {
      if (editandoId) {
        await fetchAuth(`/conductores/${editandoId}`, { method: "PUT", body: datos });
        setMensaje({ tipo: "exito", texto: "Conductor actualizado correctamente" });
      } else {
        await fetchAuth("/conductores", { method: "POST", body: datos });
        setMensaje({ tipo: "exito", texto: "Conductor registrado correctamente" });
      }
      cerrarForm();
      cargar(buscar);
    } catch (error) {
      setErrores(erroresPorCampo(error));
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (conductor) => {
    if (!window.confirm(`¿Eliminar al conductor ${conductor.apellido}, ${conductor.nombre}?`)) return;
    try {
      await fetchAuth(`/conductores/${conductor.id}`, { method: "DELETE" });
      setMensaje({ tipo: "exito", texto: "Conductor eliminado" });
      if (editandoId === conductor.id) cerrarForm();
      cargar(buscar);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
  };

  const buscarConductores = (e) => {
    e.preventDefault();
    cargar(buscar.trim());
  };

  return (
    <section className="panel">
      <div className="encabezado">
        <h1>Conductores</h1>
        {!mostrarForm && (
          <button className="boton" onClick={abrirNuevo}>
            + Nuevo conductor
          </button>
        )}
      </div>

      {mensaje && (
        <p className={`alerta alerta-${mensaje.tipo}`}>
          {mensaje.texto}
          <button className="cerrar" onClick={() => setMensaje(null)} aria-label="Cerrar">
            ×
          </button>
        </p>
      )}

      {mostrarForm && (
        <form onSubmit={guardar} noValidate className="formulario formulario-grilla tarjeta-form">
          <h2>{editandoId ? "Modificar conductor" : "Nuevo conductor"}</h2>
          <Campo label="Nombre" error={errores.nombre}>
            <input name="nombre" value={form.nombre} onChange={cambiar} maxLength={50} />
          </Campo>
          <Campo label="Apellido" error={errores.apellido}>
            <input name="apellido" value={form.apellido} onChange={cambiar} maxLength={50} />
          </Campo>
          <Campo label="N.º de documento" error={errores.dni}>
            <input name="dni" value={form.dni} onChange={cambiar} inputMode="numeric" maxLength={8} />
          </Campo>
          <Campo label="N.º de licencia" error={errores.numero_licencia}>
            <input name="numero_licencia" value={form.numero_licencia} onChange={cambiar} maxLength={20} />
          </Campo>
          <Campo label="Fecha de alta de licencia" error={errores.fecha_alta_licencia}>
            <input
              type="date"
              name="fecha_alta_licencia"
              value={form.fecha_alta_licencia}
              onChange={cambiar}
            />
          </Campo>
          <Campo label="Fecha de vencimiento de licencia" error={errores.fecha_vencimiento_licencia}>
            <input
              type="date"
              name="fecha_vencimiento_licencia"
              value={form.fecha_vencimiento_licencia}
              onChange={cambiar}
              min={form.fecha_alta_licencia || undefined}
            />
          </Campo>
          <div className="acciones-form">
            <button type="submit" className="boton" disabled={enviando}>
              {enviando ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" className="boton boton-secundario" onClick={cerrarForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <form onSubmit={buscarConductores} className="buscador">
        <input
          type="search"
          placeholder="Buscar por nombre, apellido o documento"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          maxLength={50}
        />
        <button type="submit" className="boton boton-secundario">
          Buscar
        </button>
      </form>

      {cargando ? (
        <p className="texto-secundario">Cargando conductores...</p>
      ) : conductores.length === 0 ? (
        <p className="vacio">No hay conductores registrados.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Apellido y nombre</th>
                <th>Documento</th>
                <th>Licencia</th>
                <th>Alta</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Viajes</th>
                <th>Km recorridos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conductores.map((c) => {
                const estado = estadoLicencia(c.fecha_vencimiento_licencia);
                return (
                  <tr key={c.id} className={editandoId === c.id ? "fila-activa" : ""}>
                    <td>
                      {c.apellido}, {c.nombre}
                    </td>
                    <td>{c.dni}</td>
                    <td>{c.numero_licencia}</td>
                    <td>{formatearFecha(c.fecha_alta_licencia)}</td>
                    <td>{formatearFecha(c.fecha_vencimiento_licencia)}</td>
                    <td>
                      <span className={`estado ${estado.clase}`}>{estado.texto}</span>
                    </td>
                    <td>{c.cantidad_viajes}</td>
                    <td>{formatearKm(c.total_kilometros)}</td>
                    <td className="acciones-tabla">
                      <Link
                        to={`/viajes?conductor_id=${c.id}`}
                        className="boton boton-chico boton-secundario"
                      >
                        Viajes
                      </Link>
                      <button className="boton boton-chico" onClick={() => abrirEdicion(c)}>
                        Editar
                      </button>
                      <button className="boton boton-chico boton-peligro" onClick={() => eliminar(c)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Conductores;
