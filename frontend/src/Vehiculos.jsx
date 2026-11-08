import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth, erroresPorCampo } from "./Auth.jsx";
import { validarVehiculo, normalizarPatente } from "./validaciones.js";
import { formatearKm } from "./formato.js";
import Campo from "./Campo.jsx";

const VEHICULO_VACIO = { marca: "", modelo: "", patente: "", anio: "", capacidad_carga: "" };

function Vehiculos() {
  const { fetchAuth } = useAuth();
  const [vehiculos, setVehiculos] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const [form, setForm] = useState(VEHICULO_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(
    async (texto = "") => {
      setCargando(true);
      try {
        const consulta = texto ? `?buscar=${encodeURIComponent(texto)}` : "";
        const { data } = await fetchAuth(`/vehiculos${consulta}`);
        setVehiculos(data);
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
    setForm(VEHICULO_VACIO);
    setEditandoId(null);
    setErrores({});
    setMostrarForm(true);
  };

  const abrirEdicion = (vehiculo) => {
    setForm({
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      patente: vehiculo.patente,
      anio: String(vehiculo.anio),
      capacidad_carga: String(Number(vehiculo.capacidad_carga)),
    });
    setEditandoId(vehiculo.id);
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
    const nuevosErrores = validarVehiculo(form);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const datos = {
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      patente: normalizarPatente(form.patente),
      anio: Number(form.anio),
      capacidad_carga: Number(form.capacidad_carga),
    };

    setEnviando(true);
    try {
      if (editandoId) {
        await fetchAuth(`/vehiculos/${editandoId}`, { method: "PUT", body: datos });
        setMensaje({ tipo: "exito", texto: "Vehículo actualizado correctamente" });
      } else {
        await fetchAuth("/vehiculos", { method: "POST", body: datos });
        setMensaje({ tipo: "exito", texto: "Vehículo registrado correctamente" });
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

  const eliminar = async (vehiculo) => {
    if (!window.confirm(`¿Eliminar el vehículo ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})?`)) {
      return;
    }
    try {
      await fetchAuth(`/vehiculos/${vehiculo.id}`, { method: "DELETE" });
      setMensaje({ tipo: "exito", texto: "Vehículo eliminado" });
      if (editandoId === vehiculo.id) cerrarForm();
      cargar(buscar);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
  };

  const buscarVehiculos = (e) => {
    e.preventDefault();
    cargar(buscar.trim());
  };

  return (
    <section className="panel">
      <div className="encabezado">
        <h1>Vehículos</h1>
        {!mostrarForm && (
          <button className="boton" onClick={abrirNuevo}>
            + Nuevo vehículo
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
          <h2>{editandoId ? "Modificar vehículo" : "Nuevo vehículo"}</h2>
          <Campo label="Marca" error={errores.marca}>
            <input name="marca" value={form.marca} onChange={cambiar} maxLength={50} />
          </Campo>
          <Campo label="Modelo" error={errores.modelo}>
            <input name="modelo" value={form.modelo} onChange={cambiar} maxLength={50} />
          </Campo>
          <Campo label="Patente" error={errores.patente}>
            <input
              name="patente"
              value={form.patente}
              onChange={cambiar}
              placeholder="ABC123 o AB123CD"
              maxLength={9}
            />
          </Campo>
          <Campo label="Año" error={errores.anio}>
            <input type="number" name="anio" value={form.anio} onChange={cambiar} min={1950} />
          </Campo>
          <Campo label="Capacidad de carga (kg)" error={errores.capacidad_carga}>
            <input
              type="number"
              name="capacidad_carga"
              value={form.capacidad_carga}
              onChange={cambiar}
              min={0}
              step="0.01"
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

      <form onSubmit={buscarVehiculos} className="buscador">
        <input
          type="search"
          placeholder="Buscar por marca, modelo o patente"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          maxLength={50}
        />
        <button type="submit" className="boton boton-secundario">
          Buscar
        </button>
      </form>

      {cargando ? (
        <p className="texto-secundario">Cargando vehículos...</p>
      ) : vehiculos.length === 0 ? (
        <p className="vacio">No hay vehículos registrados.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Patente</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Año</th>
                <th>Capacidad</th>
                <th>Viajes</th>
                <th>Km recorridos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vehiculos.map((v) => (
                <tr key={v.id} className={editandoId === v.id ? "fila-activa" : ""}>
                  <td>
                    <span className="patente">{v.patente}</span>
                  </td>
                  <td>{v.marca}</td>
                  <td>{v.modelo}</td>
                  <td>{v.anio}</td>
                  <td>{Number(v.capacidad_carga).toLocaleString("es-AR")} kg</td>
                  <td>{v.cantidad_viajes}</td>
                  <td>{formatearKm(v.total_kilometros)}</td>
                  <td className="acciones-tabla">
                    <Link to={`/viajes?vehiculo_id=${v.id}`} className="boton boton-chico boton-secundario">
                      Viajes
                    </Link>
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

export default Vehiculos;
