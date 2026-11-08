import express from "express";
import { body } from "express-validator";
import { db } from "./db.js";
import { verificarAutenticacion, validarNombreUsuario, hashearPassword } from "./auth.js";
import { validarId, verificarValidaciones, responderErrorDB } from "./validaciones.js";

const router = express.Router();

// Todas las rutas de usuarios requieren autenticación
router.use(verificarAutenticacion);

// Solo el propio usuario puede modificar o eliminar su cuenta
const verificarPropietario = (req, res, next) => {
  if (req.params.id !== req.user.id) {
    return res
      .status(403)
      .json({ success: false, error: "No tiene permiso para modificar a otro usuario" });
  }
  next();
};

// GET /usuarios
router.get("/", async (req, res, next) => {
  try {
    const [usuarios] = await db.execute("SELECT id, nombre, email FROM usuarios ORDER BY nombre");
    res.json({ success: true, data: usuarios });
  } catch (error) {
    next(error);
  }
});

// GET /usuarios/:id
router.get("/:id", validarId, verificarValidaciones, async (req, res, next) => {
  try {
    const [usuarios] = await db.execute("SELECT id, nombre, email FROM usuarios WHERE id = ?", [
      req.params.id,
    ]);
    if (usuarios.length === 0) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    res.json({ success: true, data: usuarios[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /usuarios/:id (nombre y, opcionalmente, nueva contraseña)
router.put(
  "/:id",
  validarId,
  validarNombreUsuario,
  body("password")
    .optional()
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
    .withMessage("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número")
    .isLength({ max: 72 })
    .withMessage("La contraseña no puede superar los 72 caracteres"),
  verificarValidaciones,
  verificarPropietario,
  async (req, res, next) => {
    const { nombre, password } = req.body;
    try {
      if (password) {
        const passwordHash = await hashearPassword(password);
        await db.execute("UPDATE usuarios SET nombre = ?, password_hash = ? WHERE id = ?", [
          nombre,
          passwordHash,
          req.params.id,
        ]);
      } else {
        await db.execute("UPDATE usuarios SET nombre = ? WHERE id = ?", [nombre, req.params.id]);
      }
      res.json({ success: true, data: { id: req.params.id, nombre, email: req.user.email } });
    } catch (error) {
      responderErrorDB(error, res, next);
    }
  }
);

// DELETE /usuarios/:id
router.delete("/:id", validarId, verificarValidaciones, verificarPropietario, async (req, res, next) => {
  try {
    await db.execute("DELETE FROM usuarios WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
});

export default router;
