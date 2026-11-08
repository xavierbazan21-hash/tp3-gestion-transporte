import { Link } from "react-router";
import { useAuth } from "./Auth.jsx";

function Home() {
  const { isAuthenticated, usuario } = useAuth();

  return (
    <section className="inicio">
      <div className="hero">
        <h1>Gestión de vehículos, conductores y viajes</h1>
        <p>
          Registrá la flota de tu empresa de transporte, administrá a tus conductores y llevá el
          historial de cada viaje con el total de kilómetros recorridos.
        </p>
        {isAuthenticated ? (
          <p className="bienvenida">
            Hola, <strong>{usuario?.nombre}</strong>. Elegí una sección para comenzar.
          </p>
        ) : (
          <div className="acciones">
            <Link to="/login" className="boton">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="boton boton-secundario">
              Crear cuenta
            </Link>
          </div>
        )}
      </div>

      <div className="tarjetas">
        <Link to="/vehiculos" className="tarjeta">
          <h2>🚛 Vehículos</h2>
          <p>Alta, modificación y baja de vehículos: marca, modelo, patente, año y capacidad de carga.</p>
        </Link>
        <Link to="/conductores" className="tarjeta">
          <h2>🧑‍✈️ Conductores</h2>
          <p>Datos personales, número de licencia y control de vencimiento.</p>
        </Link>
        <Link to="/viajes" className="tarjeta">
          <h2>🗺️ Viajes</h2>
          <p>Registro de viajes, historial por vehículo o conductor y total de kilómetros.</p>
        </Link>
      </div>
      {!isAuthenticated && (
        <p className="aviso">Las secciones de gestión requieren iniciar sesión.</p>
      )}
    </section>
  );
}

export default Home;
