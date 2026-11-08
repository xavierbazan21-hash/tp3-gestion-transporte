import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth, erroresPorCampo } from "./Auth.jsx";
import { validarViaje } from "./validaciones.js";
import { aInputFechaHora, formatearFechaHora, formatearKm } from "./formato.js";
import Campo from "./Campo.jsx";

const VIAJE_VACIO = {
  vehiculo_id: "",
  conductor_id: "",
  fecha_salida: "",
  fecha_llegada: "",
  origen: "",
  destino: "",
  kilometros: "",
  observaciones: "",
};

function Viajes() {
  const { fetchAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filtroVehiculo = searchParams.get("vehiculo_id") ?? "";
  const filtroConductor = searchParams.get("conductor_id") ?? "";

  const [vehiculos, setVehiculos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [totalKm, setTotalKm] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const [form, setForm] = useState(VIAJE_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  // Vehículos y conductores para los selectores
  useEffect(() => {
    Promise.all([fetchAuth("/vehiculos"), fetchAuth("/conductores")])
      .then(([v, c]) => {
        setVehiculos(v.data);
        setConductores(c.data);
      })
      .catch((error) => setMensaje({ tipo: "error", texto: error.message }));
  }, [fetchAuth]);

  const cargarViajes = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (filtroVehiculo) params.set("vehiculo_id", filtroVehiculo);
      if (filtroConductor) params.set("conductor_id", filtroConductor);
      const consulta = params.toString() ? `?${params}` : "";
      const respuesta = await fetchAuth(`/viajes${consulta}`);
      setViajes(respuesta.data);
      setTotalKm(respuesta.total_kilometros);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setCargando(false);
    }
  }, [fetchAuth, filtroVehiculo, filtroConductor]);

  useEffect(() => {
    cargarViajes();
  }, [cargarViajes]);

  const cambiarFiltro = (campo, valor) => {
    const params = new URLSearchParams(searchParams);
    if (valor) params.set(campo, valor);
    else params.delete(campo);
    setSearchParams(params);
  };

  const limpiarFiltros = () => setSearchParams({});

  const abrirNuevo = () => {
    setForm({ ...VIAJE_VACIO, vehiculo_id: filtroVehiculo, conductor_id: filtroConductor });
    setEditandoId(null);
    setErrores({});
    setMostrarForm(true);
  };

  const abrirEdicion = (viaje) => {
    setForm({
      vehiculo_id: String(viaje.vehiculo_id),
      conductor_id: String(viaje.conductor_id),
      fecha_salida: aInputFechaHora(viaje.fecha_salida),
      fecha_llegada: aInputFechaHora(viaje.fecha_llegada),
      origen: viaje.origen,
      destino: viaje.destino,
      kilometros: String(Number(viaje.kilometros)),
      observaciones: viaje.observaciones ?? "",
    });
    setEditandoId(viaje.id);
    setErrores({});
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    const nuevosErrores = validarViaje(form, conductores);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const datos = {
      vehiculo_id: Number(form.vehiculo_id),
      conductor_id: Number(form.conductor_id),
      fecha_salida: form.fecha_salida,
      fecha_llegada: form.fecha_llegada,
      origen: form.origen.trim(),
      destino: form.destino.trim(),
      kilometros: Number(form.kilometros),
      observaciones: form.observaciones.trim(),
    };

    setEnviando(true);
    try {
      if (editandoId) {
        await fetchAuth(`/viajes/${editandoId}`, { method: "PUT", body: datos });
        setMensaje({ tipo: "exito", texto: "Viaje actualizado correctamente" });
      } else {
        await fetchAuth("/viajes", { method: "POST", body: datos });
        setMensaje({ tipo: "exito", texto: "Viaje registrado correctamente" });
      }
      cerrarForm();
      cargarViajes();
    } catch (error) {
      setErrores(erroresPorCampo(error));
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (viaje) => {
    if (!window.confirm(`¿Eliminar el viaje ${viaje.origen} → ${viaje.destino}?`)) return;
    try {
      await fetchAuth(`/viajes/${viaje.id}`, { method: "DELETE" });
      setMensaje({ tipo: "exito", texto: "Viaje eliminado" });
      if (editandoId === viaje.id) cerrarForm();
      cargarViajes();
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
  };

  const vehiculoFiltrado = vehiculos.find((v) => String(v.id) === filtroVehiculo);
  const conductorFiltrado = conductores.find((c) => String(c.id) === filtroConductor);
  const descripcionFiltro =
    [
      vehiculoFiltrado && `vehículo ${vehiculoFiltrado.patente}`,
      conductorFiltrado && `conductor ${conductorFiltrado.apellido}, ${conductorFiltrado.nombre}`,
    ]
      .filter(Boolean)
      .join(" y ") || "todos los vehículos y conductores";

  const sinDatosBase = vehiculos.length === 0 || conductores.length === 0;

  return (
    <section className="panel">
      <div className="encabezado">
        <h1>Viajes</h1>
        {!mostrarForm && (
          <button className="boton" onClick={abrirNuevo} disabled={sinDatosBase}>
            + Registrar viaje
          </button>
        )}
      </div>

      {sinDatosBase && !cargando && (
        <p className="alerta alerta-info">
          Para registrar viajes primero debe cargar al menos un vehículo y un conductor.
        </p>
      )}

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
          <h2>{editandoId ? "Modificar viaje" : "Registrar viaje"}</h2>
          <Campo label="Vehículo" error={errores.vehiculo_id}>
            <select name="vehiculo_id" value={form.vehiculo_id} onChange={cambiar}>
              <option value="">Seleccione un vehículo</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.patente} – {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Conductor" error={errores.conductor_id}>
            <select name="conductor_id" value={form.conductor_id} onChange={cambiar}>
              <option value="">Seleccione un conductor</option>
              {conductores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.apellido}, {c.nombre} – Lic. {c.numero_licencia}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Fecha y hora de salida" error={errores.fecha_salida}>
            <input type="datetime-local" name="fecha_salida" value={form.fecha_salida} onChange={cambiar} />
          </Campo>
          <Campo label="Fecha y hora de llegada" error={errores.fecha_llegada}>
            <input
              type="datetime-local"
              name="fecha_llegada"
              value={form.fecha_llegada}
              onChange={cambiar}
              min={form.fecha_salida || undefined}
            />
          </Campo>
          <Campo label="Origen" error={errores.origen}>
            <input name="origen" value={form.origen} onChange={cambiar} maxLength={100} />
          </Campo>
          <Campo label="Destino" error={errores.destino}>
            <input name="destino" value={form.destino} onChange={cambiar} maxLength={100} />
          </Campo>
          <Campo label="Kilómetros" error={errores.kilometros}>
            <input
              type="number"
              name="kilometros"
              value={form.kilometros}
              onChange={cambiar}
              min={0}
              step="0.01"
            />
          </Campo>
          <Campo label="Observaciones (opcional)" error={errores.observaciones}>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={cambiar}
              maxLength={500}
              rows={2}
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

      <div className="filtros">
        <label className="campo">
          <span>Historial por vehículo</span>
          <select value={filtroVehiculo} onChange={(e) => cambiarFiltro("vehiculo_id", e.target.value)}>
            <option value="">Todos los vehículos</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.patente} – {v.marca} {v.modelo}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Historial por conductor</span>
          <select value={filtroConductor} onChange={(e) => cambiarFiltro("conductor_id", e.target.value)}>
            <option value="">Todos los conductores</option>
            {conductores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.apellido}, {c.nombre}
              </option>
            ))}
          </select>
        </label>
        {(filtroVehiculo || filtroConductor) && (
          <button className="boton boton-secundario" onClick={limpiarFiltros}>
            Quitar filtros
          </button>
        )}
      </div>

      <div className="resumen">
        <div>
          <span className="resumen-etiqueta">Total recorrido · {descripcionFiltro}</span>
          <strong className="resumen-valor">{formatearKm(totalKm)}</strong>
        </div>
        <div>
          <span className="resumen-etiqueta">Viajes</span>
          <strong className="resumen-valor">{viajes.length}</strong>
        </div>
      </div>

      {cargando ? (
        <p className="texto-secundario">Cargando viajes...</p>
      ) : viajes.length === 0 ? (
        <p className="vacio">No hay viajes registrados para {descripcionFiltro}.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Salida</th>
                <th>Llegada</th>
                <th>Recorrido</th>
                <th>Vehículo</th>
                <th>Conductor</th>
                <th>Km</th>
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {viajes.map((v) => (
                <tr key={v.id} className={editandoId === v.id ? "fila-activa" : ""}>
                  <td>{formatearFechaHora(v.fecha_salida)}</td>
                  <td>{formatearFechaHora(v.fecha_llegada)}</td>
                  <td>
                    {v.origen} → {v.destino}
                  </td>
                  <td>
                    <button
                      className="enlace"
                      title="Ver historial del vehículo"
                      onClick={() => cambiarFiltro("vehiculo_id", String(v.vehiculo_id))}
                    >
                      <span className="patente">{v.vehiculo_patente}</span>
                    </button>
                  </td>
                  <td>
                    <button
                      className="enlace"
                      title="Ver historial del conductor"
                      onClick={() => cambiarFiltro("conductor_id", String(v.conductor_id))}
                    >
                      {v.conductor_apellido}, {v.conductor_nombre}
                    </button>
                  </td>
                  <td>{formatearKm(v.kilometros)}</td>
                  <td className="observaciones">{v.observaciones || "—"}</td>
                  <td className="acciones-tabla">
                    <button className="boton boton-chico" onClick={() => abrirEdicion(v)}>
                      Editar
                    </button>
                    <button className="boton boton-chico boton-peligro" onClick={() => eliminar(v)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Viajes;
