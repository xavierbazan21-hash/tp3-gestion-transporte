import express from "express";
import { body, query } from "express-validator";
import { db } from "./db.js";
import { verificarAutenticacion } from "./auth.js";
import { validarId, verificarValidaciones, responderErrorDB } from "./validaciones.js";

const router = express.Router();

router.use(verificarAutenticacion);

// Convierte "2026-11-01T08:30" en "2026-11-01 08:30:00" (formato DATETIME de MySQL)
const normalizarFechaHora = (valor) => {
  const [fecha, hora = "00:00"] = String(valor).trim().replace(" ", "T").split("T");
  const horaCompleta = hora.slice(0, 8).length === 5 ? `${hora.slice(0, 5)}:00` : hora.slice(0, 8);
  return `${fecha} ${horaCompleta}`;
};

const REGEX_FECHA_HORA = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;

const validarFechaHora = (campo, etiqueta) =>
  body(campo)
    .notEmpty()
    .withMessage(`La ${etiqueta} es obligatoria`)
    .bail()
    .matches(REGEX_FECHA_HORA)
    .withMessage(`La ${etiqueta} debe tener el formato AAAA-MM-DDTHH:MM`)
    .bail()
    .custom((valor) => !Number.isNaN(new Date(String(valor).replace(" ", "T")).getTime()))
    .withMessage(`La ${etiqueta} no es una fecha válida`)
    .bail()
    .customSanitizer(normalizarFechaHora);

const validarViaje = [
  body("vehiculo_id")
    .notEmpty()
    .withMessage("El vehículo es obligatorio")
    .bail()
    .isInt({ min: 1 })
    .withMessage("El vehículo seleccionado no es válido")
    .toInt(),
  body("conductor_id")
    .notEmpty()
    .withMessage("El conductor es obligatorio")
    .bail()
    .isInt({ min: 1 })
    .withMessage("El conductor seleccionado no es válido")
    .toInt(),
  validarFechaHora("fecha_salida", "fecha de salida"),
  validarFechaHora("fecha_llegada", "fecha de llegada")
    .custom((valor, { req }) => valor >= normalizarFechaHora(req.body.fecha_salida ?? ""))
    .withMessage("La fecha de llegada no puede ser anterior a la fecha de salida"),
  body("origen")
    .trim()
    .notEmpty()
    .withMessage("El origen es obligatorio")
    .bail()
    .isLength({ max: 100 })
    .withMessage("El origen no puede superar los 100 caracteres"),
  body("destino")
    .trim()
    .notEmpty()
    .withMessage("El destino es obligatorio")
    .bail()
    .isLength({ max: 100 })
    .withMessage("El destino no puede superar los 100 caracteres"),
  body("kilometros")
    .notEmpty()
    .withMessage("Los kilómetros son obligatorios")
    .bail()
    .isFloat({ gt: 0, max: 99999999 })
    .withMessage("Los kilómetros deben ser un número mayor a 0")
    .toFloat(),
  body("observaciones")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Las observaciones no pueden superar los 500 caracteres"),
];

// Verifica que existan el vehículo y el conductor, y que la licencia esté vigente en la fecha del viaje
const verificarRelaciones = async (req, res, next) => {
  try {
    const { vehiculo_id, conductor_id, fecha_salida } = req.body;
    const [vehiculos] = await db.execute("SELECT id FROM vehiculos WHERE id = ?", [vehiculo_id]);
    if (vehiculos.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        errores: [{ campo: "vehiculo_id", mensaje: "El vehículo no existe" }],
      });
    }
    const [conductores] = await db.execute(
      "SELECT fecha_alta_licencia, fecha_vencimiento_licencia FROM conductores WHERE id = ?",
      [conductor_id]
    );
    if (conductores.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        errores: [{ campo: "conductor_id", mensaje: "El conductor no existe" }],
      });
    }
    const fechaViaje = fecha_salida.slice(0, 10);
    const { fecha_alta_licencia, fecha_vencimiento_licencia } = conductores[0];
    if (fechaViaje < fecha_alta_licencia || fechaViaje > fecha_vencimiento_licencia) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        errores: [
          { campo: "conductor_id", mensaje: "La licencia del conductor no está vigente en la fecha de salida" },
        ],
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

const SELECT_VIAJES = `
  SELECT vi.*,
         v.marca AS vehiculo_marca, v.modelo AS vehiculo_modelo, v.patente AS vehiculo_patente,
         c.nombre AS conductor_nombre, c.apellido AS conductor_apellido
  FROM viajes vi
  JOIN vehiculos v ON v.id = vi.vehiculo_id
  JOIN conductores c ON c.id = vi.conductor_id`;

// GET /viajes?vehiculo_id=1&conductor_id=2: listado (filtrable) con total de kilómetros
router.get(
  "/",
  query("vehiculo_id").optional().isInt({ min: 1 }).withMessage("vehiculo_id debe ser un entero positivo").toInt(),
  query("conductor_id").optional().isInt({ min: 1 }).withMessage("conductor_id debe ser un entero positivo").toInt(),
  verificarValidaciones,
  async (req, res, next) => {
    try {
      const filtros = [];
      const params = [];
      if (req.query.vehiculo_id) {
        filtros.push("vi.vehiculo_id = ?");
        params.push(req.query.vehiculo_id);
      }
      if (req.query.conductor_id) {
        filtros.push("vi.conductor_id = ?");
        params.push(req.query.conductor_id);
      }
      let sql = SELECT_VIAJES;
      if (filtros.length > 0) sql += ` WHERE ${filtros.join(" AND ")}`;
      sql += " ORDER BY vi.fecha_salida DESC";

      const [viajes] = await db.execute(sql, params);
      const totalKilometros = viajes.reduce((total, v) => total + Number(v.kilometros), 0);
      res.json({
        success: true,
        data: viajes,
        total_kilometros: Number(totalKilometros.toFixed(2)),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /viajes/:id
router.get("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [viajes] = await db.execute(`${SELECT_VIAJES} WHERE vi.id = ?`, [req.params.id]);
    if (viajes.length === 0) {
      return res.status(404).json({ success: false, error: "Viaje no encontrado" });
    }
    res.json({ success: true, data: viajes[0] });
  } catch (error) {
    next(error);
  }
});

// POST /viajes
router.post("/", validarViaje, verificarValidaciones, verificarRelaciones, async (req, res, next) => {
  const { vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros } = req.body;
  const observaciones = req.body.observaciones || null;
  try {
    const [resultado] = await db.execute(
      `INSERT INTO viajes
         (vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros, observaciones]
    );
    const [viajes] = await db.execute(`${SELECT_VIAJES} WHERE vi.id = ?`, [resultado.insertId]);
    res.status(201).json({ success: true, data: viajes[0] });
  } catch (error) {
    responderErrorDB(error, res, next);
  }
});

// PUT /viajes/:id
router.put(
  "/:id",
  validarId,
  validarViaje,
  verificarValidaciones,
  verificarRelaciones,
  async (req, res, next) => {
    const { vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros } = req.body;
    const observaciones = req.body.observaciones || null;
    try {
      const [resultado] = await db.execute(
        `UPDATE viajes
         SET vehiculo_id = ?, conductor_id = ?, fecha_salida = ?, fecha_llegada = ?,
             origen = ?, destino = ?, kilometros = ?, observaciones = ?
         WHERE id = ?`,
        [vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros, observaciones, req.params.id]
      );
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ success: false, error: "Viaje no encontrado" });
      }
      const [viajes] = await db.execute(`${SELECT_VIAJES} WHERE vi.id = ?`, [req.params.id]);
      res.json({ success: true, data: viajes[0] });
    } catch (error) {
      responderErrorDB(error, res, next);
    }
  }
);

// DELETE /viajes/:id
router.delete("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [resultado] = await db.execute("DELETE FROM viajes WHERE id = ?", [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Viaje no encontrado" });
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
});

export default router;
