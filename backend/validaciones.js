import { param, validationResult } from "express-validator";

// Valida que el parámetro :id de la ruta sea un entero positivo
export const validarId = param("id")
  .isInt({ min: 1 })
  .withMessage("El id debe ser un número entero positivo")
  .toInt();

// Corta la petición con 400 si alguna validación falló
export const verificarValidaciones = (req, res, next) => {
  const resultado = validationResult(req);
  if (!resultado.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Datos inválidos",
      errores: resultado.array().map((e) => ({ campo: e.path, mensaje: e.msg })),
    });
  }
  next();
};

// Traduce errores conocidos de MySQL a respuestas 400
export const responderErrorDB = (error, res, next, mensajes = {}) => {
  if (error.code === "ER_DUP_ENTRY") {
    return res
      .status(400)
      .json({ success: false, error: mensajes.duplicado ?? "El registro ya existe" });
  }
  if (error.code === "ER_ROW_IS_REFERENCED_2") {
    return res
      .status(400)
      .json({ success: false, error: mensajes.referenciado ?? "El registro tiene datos asociados" });
  }
  next(error);
};
