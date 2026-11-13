# TP3 – Gestión de vehículos, conductores y viajes

Programación IV – Tecnicatura Universitaria en Programación – UTN FRLR.

Aplicación para registrar los vehículos de una empresa de transporte, sus conductores y los viajes realizados, con historial de viajes y total de kilómetros por vehículo o por conductor.

## Estructura

```
backend/
  index.js          Servidor Express, rutas y manejo de errores 404/500
  db.js             Pool de conexión MySQL (mysql2)
  auth.js           Registro, login, JWT (4 h) y estrategia Passport
  validaciones.js   Middlewares comunes de express-validator
  usuarios.js       Rutas /usuarios
  vehiculos.js      Rutas /vehiculos
  conductores.js    Rutas /conductores
  viajes.js         Rutas /viajes
  db.sql            Definición de la base de datos y tablas
  http/             Archivos .http para probar la API
frontend/
  index.html
  src/
    main.jsx, App.jsx   Punto de entrada y rutas
    Auth.jsx            Contexto de sesión, fetchAuth y AuthPage
    Layout.jsx          Barra de navegación
    Home.jsx            Página principal pública
    Login.jsx, Registro.jsx
    Vehiculos.jsx, Conductores.jsx, Viajes.jsx
    Campo.jsx           Campo de formulario con mensaje de error
    validaciones.js     Validaciones de formularios
    formato.js          Formato de fechas y kilómetros
    index.css           Estilos (CSS puro)
```

## Puesta en marcha

### 1. Base de datos

Ejecutar `backend/db.sql` en MySQL (crea la base `tp3_transporte` y sus tablas).

### 2. Backend

```bash
cd backend
cp .env.example .env   # completar usuario/contraseña de MySQL y JWT_SECRET
npm install
npm run dev            # http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3000
npm install
npm run dev            # http://localhost:5173
```

## API

Todas las rutas, salvo `/auth/registro` y `/auth/login`, requieren el header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/registro` | Registro de usuario (devuelve token) |
| POST | `/auth/login` | Inicio de sesión (devuelve token) |
| GET | `/auth/perfil` | Usuario autenticado |
| GET / PUT / DELETE | `/usuarios`, `/usuarios/:id` | Usuarios (solo se puede modificar la propia cuenta, si no 403) |
| GET / POST | `/vehiculos` | Listado (`?buscar=`) y alta |
| GET / PUT / DELETE | `/vehiculos/:id` | Consulta, modificación y baja |
| GET | `/vehiculos/:id/viajes` | Historial y total de km del vehículo |
| GET / POST | `/conductores` | Listado (`?buscar=`) y alta |
| GET / PUT / DELETE | `/conductores/:id` | Consulta, modificación y baja |
| GET | `/conductores/:id/viajes` | Historial y total de km del conductor |
| GET / POST | `/viajes` | Listado (`?vehiculo_id=`, `?conductor_id=`) con total de km, y alta |
| GET / PUT / DELETE | `/viajes/:id` | Consulta, modificación y baja |

### Códigos de respuesta

- `400` datos inválidos (express-validator), registros duplicados o con viajes asociados.
- `401` token ausente, inválido o vencido; credenciales incorrectas.
- `403` intento de modificar o eliminar a otro usuario.
- `404` recurso inexistente.
- `500` error interno.

## Seguridad

- Contraseñas hasheadas con bcrypt; nunca se devuelven en las respuestas.
- JWT firmado con `JWT_SECRET` y vencimiento de 4 horas, verificado con Passport (`passport-jwt`).
- El frontend descarta tokens vencidos y cierra la sesión ante cualquier `401`.
