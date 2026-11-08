import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { body } from "express-validator";
import { db } from "./db.js";
import { verificarValidaciones, responderErrorDB } from "./validaciones.js";

const router = express.Router();

// Estrategia de Passport que verifica el JWT enviado como "Authorization: Bearer <token>"
export function authConfig() {
  passport.use(
    new Strategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
      },
      async (payload, next) => {
        try {
          // Se comprueba que el usuario del token siga existiendo
          const [usuarios] = await db.execute(
            "SELECT id, nombre, email FROM usuarios WHERE id = ?",
            [payload.userId]
          );
          if (usuarios.length === 0) return next(null, false);
          next(null, usuarios[0]);
        } catch (error) {
          next(error);
        }
      }
    )
  );
}

// Middleware para rutas protegidas: responde 401 en JSON si el token falta, es inválido o expiró
export const verificarAutenticacion = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (error, usuario, info) => {
    if (error) return next(error);
    if (!usuario) {
      const expirado = info?.name === "TokenExpiredError";
      return res.status(401).json({
        success: false,
        error: expirado ? "La sesión expiró, inicie sesión nuevamente" : "No autorizado",
      });
    }
    req.user = usuario;
    next();
  })(req, res, next);
};

const SALT_ROUNDS = 10;
const EXPIRACION_TOKEN = "4h";

const validarEmail = body("email")
  .trim()
  .notEmpty()
  .withMessage("El email es obligatorio")
  .bail()
  .isEmail()
  .withMessage("El email no tiene un formato válido")
  .isLength({ max: 150 })
  .withMessage("El email no puede superar los 150 caracteres")
  .normalizeEmail();

export const validarNombreUsuario = body("nombre")
  .trim()
  .notEmpty()
  .withMessage("El nombre es obligatorio")
  .bail()
  .isLength({ min: 2, max: 100 })
  .withMessage("El nombre debe tener entre 2 y 100 caracteres");

export const validarPasswordNueva = body("password")
  .isString()
  .withMessage("La contraseña es obligatoria")
  .bail()
  .isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  .withMessage("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número")
  .isLength({ max: 72 })
  .withMessage("La contraseña no puede superar los 72 caracteres");

export const hashearPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const generarToken = (usuario) =>
  jwt.sign({ userId: usuario.id, email: usuario.email }, process.env.JWT_SECRET, {
    expiresIn: EXPIRACION_TOKEN,
  });

// POST /auth/registro
router.post(
  "/registro",
  validarNombreUsuario,
  validarEmail,
  validarPasswordNueva,
  verificarValidaciones,
  async (req, res, next) => {
    const { nombre, email, password } = req.body;
    try {
      const passwordHash = await hashearPassword(password);
      const [resultado] = await db.execute(
        "INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)",
        [nombre, email, passwordHash]
      );
      const usuario = { id: resultado.insertId, nombre, email };
      res.status(201).json({ success: true, data: usuario, token: generarToken(usuario) });
    } catch (error) {
      responderErrorDB(error, res, next, { duplicado: "Ya existe un usuario con ese email" });
    }
  }
);

// POST /auth/login
router.post(
  "/login",
  validarEmail,
  body("password").isString().notEmpty().withMessage("La contraseña es obligatoria"),
  verificarValidaciones,
  async (req, res, next) => {
    const { email, password } = req.body;
    try {
      const [usuarios] = await db.execute(
        "SELECT id, nombre, email, password_hash FROM usuarios WHERE email = ?",
        [email]
      );

      // Mismo mensaje para email o contraseña incorrectos
      const usuario = usuarios[0];
      const coincide = usuario && (await bcrypt.compare(password, usuario.password_hash));
      if (!coincide) {
        return res.status(401).json({ success: false, error: "Email o contraseña incorrectos" });
      }

      const datos = { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
      res.json({ success: true, data: datos, token: generarToken(datos) });
    } catch (error) {
      next(error);
    }
  }
);

// GET /auth/perfil: datos del usuario autenticado
router.get("/perfil", verificarAutenticacion, (req, res) => {
  res.json({ success: true, data: req.user });
});

export default router;
