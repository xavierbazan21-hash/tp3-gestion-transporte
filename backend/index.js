import "dotenv/config";
import express from "express";
import cors from "cors";
import { probarConexion } from "./db.js";
import passport from "passport";
import authRouter, { authConfig } from "./auth.js";
import usuariosRouter from "./usuarios.js";
import vehiculosRouter from "./vehiculos.js";
import conductoresRouter from "./conductores.js";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));

authConfig();
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({ success: true, mensaje: "API de gestión de vehículos, conductores y viajes" });
});

app.use("/auth", authRouter);
app.use("/usuarios", usuariosRouter);
app.use("/vehiculos", vehiculosRouter);
app.use("/conductores", conductoresRouter);

// Ruta inexistente
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Recurso no encontrado" });
});

// Error no controlado
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, error: "JSON inválido en el cuerpo de la petición" });
  }
  console.error(err);
  res.status(500).json({ success: false, error: "Error interno del servidor" });
});

probarConexion()
  .then(() => {
    app.listen(port, () => {
      console.log(`API escuchando en http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("No se pudo conectar a MySQL:", error.message);
    process.exit(1);
  });
