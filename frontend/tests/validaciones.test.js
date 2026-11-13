import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizarPatente,
  validarConductor,
  validarLogin,
  validarRegistro,
  validarVehiculo,
  validarViaje,
} from "../src/validaciones.js";

test("validarLogin acepta credenciales con formato válido", () => {
  assert.deepEqual(validarLogin({ email: "persona@example.com", password: "secreto" }), {});
});

test("validarLogin informa email y contraseña obligatorios", () => {
  const errores = validarLogin({ email: " ", password: "" });
  assert.equal(errores.email, "El email es obligatorio");
  assert.equal(errores.password, "La contraseña es obligatoria");
});

test("validarRegistro exige contraseña segura y confirmación coincidente", () => {
  const errores = validarRegistro({
    nombre: "Ana",
    email: "ana@example.com",
    password: "debil",
    confirmar: "otra",
  });
  assert.equal(errores.password, "Mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número");
  assert.equal(errores.confirmar, "Las contraseñas no coinciden");
});

test("normalizarPatente elimina separadores y convierte a mayúsculas", () => {
  assert.equal(normalizarPatente("ab-123 cd"), "AB123CD");
});

test("validarVehiculo acepta patente vieja y rechaza capacidad no positiva", () => {
  const datos = {
    marca: "Ford",
    modelo: "Transit",
    patente: "ABC-123",
    anio: String(new Date().getFullYear()),
    capacidad_carga: "0",
  };
  const errores = validarVehiculo(datos);
  assert.equal(errores.patente, undefined);
  assert.equal(errores.capacidad_carga, "Debe ser un número mayor a 0");
});

test("validarConductor rechaza vencimiento anterior al alta", () => {
  const errores = validarConductor({
    nombre: "Ana",
    apellido: "Pérez",
    dni: "12345678",
    numero_licencia: "AB1234",
    fecha_alta_licencia: "2025-01-01",
    fecha_vencimiento_licencia: "2024-12-31",
  });
  assert.equal(errores.fecha_vencimiento_licencia, "Debe ser posterior a la fecha de alta");
});

test("validarViaje rechaza llegada anterior a la salida", () => {
  const errores = validarViaje({
    vehiculo_id: "1",
    conductor_id: "2",
    fecha_salida: "2026-11-13T10:00",
    fecha_llegada: "2026-11-13T09:00",
    origen: "La Rioja",
    destino: "Chilecito",
    kilometros: "200",
    observaciones: "",
  });
  assert.equal(errores.fecha_llegada, "No puede ser anterior a la salida");
});

test("validarViaje exige licencia vigente en la fecha de salida", () => {
  const errores = validarViaje(
    {
      vehiculo_id: "1",
      conductor_id: "2",
      fecha_salida: "2026-11-13T10:00",
      fecha_llegada: "2026-11-13T12:00",
      origen: "La Rioja",
      destino: "Chilecito",
      kilometros: "200",
      observaciones: "",
    },
    [{ id: 2, fecha_alta_licencia: "2020-01-01", fecha_vencimiento_licencia: "2026-11-12" }]
  );
  assert.match(errores.conductor_id, /licencia.*no está vigente/i);
});
