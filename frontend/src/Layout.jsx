import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "./Auth.jsx";

function Layout() {
  const { isAuthenticated, usuario, logout } = useAuth();
  const navigate = useNavigate();

  const salir = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <header className="barra">
        <NavLink to="/" className="marca-app">
          🚚 Gestión de Transporte
        </NavLink>
        <nav className="menu">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/vehiculos">Vehículos</NavLink>
              <NavLink to="/conductores">Conductores</NavLink>
              <NavLink to="/viajes">Viajes</NavLink>
            </>
          )}
        </nav>
        <div className="sesion">
          {isAuthenticated ? (
            <>
              <span className="usuario">{usuario?.nombre}</span>
              <button className="boton boton-secundario" onClick={salir}>
                Salir
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="boton boton-secundario">
                Ingresar
              </NavLink>
              <NavLink to="/registro" className="boton">
                Registrarse
              </NavLink>
            </>
          )}
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
      <footer className="pie">Programación IV · UTN FRLR · TP3 2026</footer>
    </>
  );
}

export default Layout;
