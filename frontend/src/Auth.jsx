import { createContext, useCallback, useContext, useState } from "react";
import { Navigate, useLocation } from "react-router";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const CLAVE_SESION = "tp3_sesion";

const AuthContext = createContext(null);

// Lee el payload del JWT para conocer su vencimiento (no verifica la firma: eso lo hace el backend)
const tokenVigente = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const leerSesion = () => {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION));
    if (sesion?.token && tokenVigente(sesion.token)) return sesion;
  } catch {
    // sesión corrupta: se ignora
  }
  localStorage.removeItem(CLAVE_SESION);
  return null;
};

// Envía la petición y devuelve el JSON; si la respuesta no es OK lanza un Error con el detalle
const pedir = async (url, opciones = {}) => {
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    throw Object.assign(new Error("No se pudo conectar con el servidor"), { status: 0 });
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(datos.error ?? `Error ${respuesta.status}`);
    error.status = respuesta.status;
    error.errores = datos.errores ?? [];
    throw error;
  }
  return datos;
};

// Convierte [{campo, mensaje}] del backend en { campo: mensaje } para los formularios
export const erroresPorCampo = (error) =>
  Object.fromEntries((error.errores ?? []).map((e) => [e.campo, e.mensaje]));

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesion);

  const guardarSesion = (datos) => {
    const nueva = { token: datos.token, usuario: datos.data };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(nueva));
    setSesion(nueva);
  };

  const login = async (email, password) => {
    const datos = await pedir(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    guardarSesion(datos);
  };

  const registro = async (nombre, email, password) => {
    const datos = await pedir(`${API_URL}/auth/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password }),
    });
    guardarSesion(datos);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(CLAVE_SESION);
    setSesion(null);
  }, []);

  // fetch autenticado contra la API REST: agrega el token y cierra la sesión ante un 401
  const fetchAuth = useCallback(
    async (ruta, { method = "GET", body } = {}) => {
      try {
        return await pedir(`${API_URL}${ruta}`, {
          method,
          headers: {
            Authorization: `Bearer ${sesion?.token}`,
            ...(body !== undefined && { "Content-Type": "application/json" }),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch (error) {
        if (error.status === 401) logout();
        throw error;
      }
    },
    [sesion?.token, logout]
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!sesion,
        usuario: sesion?.usuario ?? null,
        login,
        registro,
        logout,
        fetchAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Protege una página: si no hay sesión redirige al login recordando a dónde quería ir
export function AuthPage({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ desde: location.pathname + location.search }} replace />;
  }
  return children;
}
