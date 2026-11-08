import express from "express";
import { body, query } from "express-validator";
import { db } from "./db.js";
import { verificarAutenticacion } from "./auth.js";
import { validarId, verificarValidaciones, responderErrorDB } from "./validaciones.js";

const router = express.Router();

router.use(verificarAutenticacion);

const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+$/;

const validarConductor = [
  body("nombre")
    .trim()
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .bail()
    .isLength({ max: 50 })
    .withMessage("El nombre no puede superar los 50 caracteres")
    .matches(REGEX_NOMBRE)
    .withMessage("El nombre solo puede contener letras"),
  body("apellido")
    .trim()
    .notEmpty()
    .withMessage("El apellido es obligatorio")
    .bail()
    .isLength({ max: 50 })
    .withMessage("El apellido no puede superar los 50 caracteres")
    .matches(REGEX_NOMBRE)
    .withMessage("El apellido solo puede contener letras"),
  body("dni")
    .trim()
    .notEmpty()
    .withMessage("El número de documento es obligatorio")
    .bail()
    .matches(/^\d{7,8}$/)
    .withMessage("El número de documento debe tener 7 u 8 dígitos sin puntos"),
  body("numero_licencia")
    .trim()
    .notEmpty()
    .withMessage("El número de licencia es obligatorio")
    .bail()
    .isAlphanumeric()
    .withMessage("El número de licencia solo puede contener letras y números")
    .isLength({ min: 4, max: 20 })
    .withMessage("El número de licencia debe tener entre 4 y 20 caracteres")
    .customSanitizer((valor) => String(valor).toUpperCase()),
  body("fecha_alta_licencia")
    .notEmpty()
    .withMessage("La fecha de alta de la licencia es obligatoria")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("La fecha de alta debe tener el formato AAAA-MM-DD")
    .bail()
    .custom((valor) => new Date(valor) <= new Date())
    .withMessage("La fecha de alta de la licencia no puede ser futura"),
  body("fecha_vencimiento_licencia")
    .notEmpty()
    .withMessage("La fecha de vencimiento de la licencia es obligatoria")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("La fecha de vencimiento debe tener el formato AAAA-MM-DD")
    .bail()
    .custom((valor, { req }) => new Date(valor) > new Date(req.body.fecha_alta_licencia))
    .withMessage("La fecha de vencimiento debe ser posterior a la fecha de alta"),
];

const MENSAJES_DB = {
  duplicado: "Ya existe un conductor con ese número de documento o de licencia",
  referenciado: "No se puede eliminar el conductor porque tiene viajes registrados",
};

// GET /conductores?buscar=texto
router.get(
  "/",
  query("buscar").optional().trim().isLength({ max: 50 }).withMessage("Búsqueda demasiado larga"),
  verificarValidaciones,
  async (req, res, next) => {
    try {
      let sql = `SELECT c.*, COUNT(vi.id) AS cantidad_viajes,
                        COALESCE(SUM(vi.kilometros), 0) AS total_kilometros
                 FROM conductores c
                 LEFT JOIN viajes vi ON vi.conductor_id = c.id`;
      const params = [];
      if (req.query.buscar) {
        sql += " WHERE c.nombre LIKE ? OR c.apellido LIKE ? OR c.dni LIKE ?";
        const patron = `%${req.query.buscar}%`;
        params.push(patron, patron, patron);
      }
      sql += " GROUP BY c.id ORDER BY c.apellido, c.nombre";
      const [conductores] = await db.execute(sql, params);
      res.json({ success: true, data: conductores });
    } catch (error) {
      next(error);
    }
  }
);

// GET /conductores/:id
router.get("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [conductores] = await db.execute("SELECT * FROM conductores WHERE id = ?", [req.params.id]);
    if (conductores.length === 0) {
      return res.status(404).json({ success: false, error: "Conductor no encontrado" });
    }
    res.json({ success: true, data: conductores[0] });
  } catch (error) {
    next(error);
  }
});

// GET /conductores/:id/viajes: historial de viajes y total de kilómetros del conductor
router.get("/:id/viajes", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [conductores] = await db.execute("SELECT * FROM conductores WHERE id = ?", [req.params.id]);
    if (conductores.length === 0) {
      return res.status(404).json({ success: false, error: "Conductor no encontrado" });
    }
    const [viajes] = await db.execute(
      `SELECT vi.*, v.marca AS vehiculo_marca, v.modelo AS vehiculo_modelo, v.patente AS vehiculo_patente
       FROM viajes vi
       JOIN vehiculos v ON v.id = vi.vehiculo_id
       WHERE vi.conductor_id = ?
       ORDER BY vi.fecha_salida DESC`,
      [req.params.id]
    );
    const totalKilometros = viajes.reduce((total, v) => total + Number(v.kilometros), 0);
    res.json({
      success: true,
      data: { conductor: conductores[0], viajes, total_kilometros: Number(totalKilometros.toFixed(2)) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /conductores
router.post("/", validarConductor, verificarValidaciones, async (req, res, next) => {
  const { nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia } =
    req.body;
  try {
    const [resultado] = await db.execute(
      `INSERT INTO conductores
         (nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia]
    );
    res.status(201).json({
      success: true,
      data: {
        id: resultado.insertId,
        nombre,
        apellido,
        dni,
        numero_licencia,
        fecha_alta_licencia,
        fecha_vencimiento_licencia,
      },
    });
  } catch (error) {
    responderErrorDB(error, res, next, MENSAJES_DB);
  }
});

// PUT /conductores/:id
router.put("/:id", validarId, validarConductor, verificarValidaciones, async (req, res, next) => {
  const { nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia } =
    req.body;
  try {
    const [resultado] = await db.execute(
      `UPDATE conductores
       SET nombre = ?, apellido = ?, dni = ?, numero_licencia = ?,
           fecha_alta_licencia = ?, fecha_vencimiento_licencia = ?
       WHERE id = ?`,
      [nombre, apellido, dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia, req.params.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Conductor no encontrado" });
    }
    res.json({
      success: true,
      data: {
        id: req.params.id,
        nombre,
        apellido,
        dni,
        numero_licencia,
        fecha_alta_licencia,
        fecha_vencimiento_licencia,
      },
    });
  } catch (error) {
    responderErrorDB(error, res, next, MENSAJES_DB);
  }
});

// DELETE /conductores/:id
router.delete("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [resultado] = await db.execute("DELETE FROM conductores WHERE id = ?", [req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Conductor no encontrado" });
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    responderErrorDB(error, res, next, MENSAJES_DB);
  }
});

export default router;
