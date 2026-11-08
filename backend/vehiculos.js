import express from "express";
import { body, query } from "express-validator";
import { db } from "./db.js";
import { verificarAutenticacion } from "./auth.js";
import { validarId, verificarValidaciones, responderErrorDB } from "./validaciones.js";

const router = express.Router();

router.use(verificarAutenticacion);

// Formato viejo (ABC123) o Mercosur (AB123CD)
const REGEX_PATENTE = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;

const validarVehiculo = [
  body("marca")
    .trim()
    .notEmpty()
    .withMessage("La marca es obligatoria")
    .bail()
    .isLength({ max: 50 })
    .withMessage("La marca no puede superar los 50 caracteres"),
  body("modelo")
    .trim()
    .notEmpty()
    .withMessage("El modelo es obligatorio")
    .bail()
    .isLength({ max: 50 })
    .withMessage("El modelo no puede superar los 50 caracteres"),
  body("patente")
    .trim()
    .notEmpty()
    .withMessage("La patente es obligatoria")
    .bail()
    .customSanitizer((valor) => String(valor).toUpperCase().replace(/\s|-/g, ""))
    .matches(REGEX_PATENTE)
    .withMessage("La patente debe tener el formato ABC123 o AB123CD"),
  body("anio")
    .notEmpty()
    .withMessage("El año es obligatorio")
    .bail()
    .isInt({ min: 1950, max: new Date().getFullYear() + 1 })
    .withMessage(`El año debe estar entre 1950 y ${new Date().getFullYear() + 1}`)
    .toInt(),
  body("capacidad_carga")
    .notEmpty()
    .withMessage("La capacidad de carga es obligatoria")
    .bail()
    .isFloat({ gt: 0, max: 99999999 })
    .withMessage("La capacidad de carga debe ser un número mayor a 0 (kg)")
    .toFloat(),
];

const MENSAJES_DB = {
  duplicado: "Ya existe un vehículo con esa patente",
  referenciado: "No se puede eliminar el vehículo porque tiene viajes registrados",
};

// GET /vehiculos?buscar=texto
router.get(
  "/",
  query("buscar").optional().trim().isLength({ max: 50 }).withMessage("Búsqueda demasiado larga"),
  verificarValidaciones,
  async (req, res, next) => {
    try {
      let sql = `SELECT v.*, COUNT(vi.id) AS cantidad_viajes,
                        COALESCE(SUM(vi.kilometros), 0) AS total_kilometros
                 FROM vehiculos v
                 LEFT JOIN viajes vi ON vi.vehiculo_id = v.id`;
      const params = [];
      if (req.query.buscar) {
        sql += " WHERE v.marca LIKE ? OR v.modelo LIKE ? OR v.patente LIKE ?";
        const patron = `%${req.query.buscar}%`;
        params.push(patron, patron, patron);
      }
      sql += " GROUP BY v.id ORDER BY v.marca, v.modelo";
      const [vehiculos] = await db.execute(sql, params);
      res.json({ success: true, data: vehiculos });
    } catch (error) {
      next(error);
    }
  }
);

// GET /vehiculos/:id
router.get("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [vehiculos] = await db.execute("SELECT * FROM vehiculos WHERE id = ?", [req.params.id]);
    if (vehiculos.length === 0) {
      return res.status(404).json({ success: false, error: "Vehículo no encontrado" });
    }
    res.json({ success: true, data: vehiculos[0] });
  } catch (error) {
    next(error);
  }
});

// GET /vehiculos/:id/viajes: historial de viajes y total de kilómetros del vehículo
router.get("/:id/viajes", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [vehiculos] = await db.execute("SELECT * FROM vehiculos WHERE id = ?", [req.params.id]);
    if (vehiculos.length === 0) {
      return res.status(404).json({ success: false, error: "Vehículo no encontrado" });
    }
    const [viajes] = await db.execute(
      `SELECT vi.*, c.nombre AS conductor_nombre, c.apellido AS conductor_apellido
       FROM viajes vi
       JOIN conductores c ON c.id = vi.conductor_id
       WHERE vi.vehiculo_id = ?
       ORDER BY vi.fecha_salida DESC`,
      [req.params.id]
    );
    const totalKilometros = viajes.reduce((total, v) => total + Number(v.kilometros), 0);
    res.json({
      success: true,
      data: { vehiculo: vehiculos[0], viajes, total_kilometros: Number(totalKilometros.toFixed(2)) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /vehiculos
router.post("/", validarVehiculo, verificarValidaciones, async (req, res, next) => {
  const { marca, modelo, patente, anio, capacidad_carga } = req.body;
  try {
    const [resultado] = await db.execute(
      "INSERT INTO vehiculos (marca, modelo, patente, anio, capacidad_carga) VALUES (?, ?, ?, ?, ?)",
      [marca, modelo, patente, anio, capacidad_carga]
    );
    res.status(201).json({
      success: true,
      data: { id: resultado.insertId, marca, modelo, patente, anio, capacidad_carga },
    });
  } catch (error) {
    responderErrorDB(error, res, next, MENSAJES_DB);
  }
});

// PUT /vehiculos/:id
router.put("/:id", validarId, validarVehiculo, verificarValidaciones, async (req, res, next) => {
  const { marca, modelo, patente, anio, capacidad_carga } = req.body;
  try {
    const [resultado] = await db.execute(
      "UPDATE vehiculos SET marca = ?, modelo = ?, patente = ?, anio = ?, capacidad_carga = ? WHERE id = ?",
      [marca, modelo, patente, anio, capacidad_carga, req.params.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Vehículo no encontrado" });
    }
    res.json({
      success: true,
      data: { id: req.params.id, marca, modelo, patente, anio, capacidad_carga },
    });
  } catch (error) {
    responderErrorDB(error, res, next, MENSAJES_DB);
  }
});

// DELETE /vehiculos/:id
router.delete("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [resultado] = await db.execute("DELETE FROM vehiculos WHERE id = ?", [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Vehículo no encontrado" });
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    responderErrorDB(error, res, next, MENSAJES_DB);
  }
});

export default router;
