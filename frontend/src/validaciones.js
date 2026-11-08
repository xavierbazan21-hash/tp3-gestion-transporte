// Validaciones de formularios del lado del cliente.
// Cada función recibe los valores y devuelve un objeto { campo: mensaje } (vacío si es válido).

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REGEX_PATENTE = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;
const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+$/;
const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

const vacio = (valor) => String(valor ?? "").trim() === "";

export const normalizarPatente = (patente) => patente.toUpperCase().replace(/\s|-/g, "");

export function validarLogin({ email, password }) {
  const errores = {};
  if (vacio(email)) errores.email = "El email es obligatorio";
  else if (!REGEX_EMAIL.test(email.trim())) errores.email = "El email no tiene un formato válido";
  if (vacio(password)) errores.password = "La contraseña es obligatoria";
  return errores;
}

export function validarRegistro({ nombre, email, password, confirmar }) {
  const errores = validarLogin({ email, password });
  if (vacio(nombre)) errores.nombre = "El nombre es obligatorio";
  else if (nombre.trim().length < 2 || nombre.trim().length > 100)
    errores.nombre = "El nombre debe tener entre 2 y 100 caracteres";
  if (!errores.password && !REGEX_PASSWORD.test(password))
    errores.password = "Mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número";
  if (password !== confirmar) errores.confirmar = "Las contraseñas no coinciden";
  return errores;
}

export function validarVehiculo({ marca, modelo, patente, anio, capacidad_carga }) {
  const errores = {};
  const anioMaximo = new Date().getFullYear() + 1;
  if (vacio(marca)) errores.marca = "La marca es obligatoria";
  else if (marca.trim().length > 50) errores.marca = "Máximo 50 caracteres";
  if (vacio(modelo)) errores.modelo = "El modelo es obligatorio";
  else if (modelo.trim().length > 50) errores.modelo = "Máximo 50 caracteres";
  if (vacio(patente)) errores.patente = "La patente es obligatoria";
  else if (!REGEX_PATENTE.test(normalizarPatente(patente)))
    errores.patente = "Formato ABC123 o AB123CD";
  if (vacio(anio)) errores.anio = "El año es obligatorio";
  else if (!Number.isInteger(Number(anio)) || anio < 1950 || anio > anioMaximo)
    errores.anio = `Debe ser un año entre 1950 y ${anioMaximo}`;
  if (vacio(capacidad_carga)) errores.capacidad_carga = "La capacidad de carga es obligatoria";
  else if (!(Number(capacidad_carga) > 0)) errores.capacidad_carga = "Debe ser un número mayor a 0";
  return errores;
}

export function validarConductor(datos) {
  const { dni, numero_licencia, fecha_alta_licencia, fecha_vencimiento_licencia } = datos;
  const errores = {};
  const hoy = new Date().toISOString().slice(0, 10);
  for (const [campo, etiqueta] of [
    ["nombre", "El nombre"],
    ["apellido", "El apellido"],
  ]) {
    const valor = datos[campo];
    if (vacio(valor)) errores[campo] = `${etiqueta} es obligatorio`;
    else if (valor.trim().length > 50) errores[campo] = "Máximo 50 caracteres";
    else if (!REGEX_NOMBRE.test(valor.trim())) errores[campo] = "Solo puede contener letras";
  }
  if (vacio(dni)) errores.dni = "El número de documento es obligatorio";
  else if (!/^\d{7,8}$/.test(dni.trim())) errores.dni = "7 u 8 dígitos, sin puntos";
  if (vacio(numero_licencia)) errores.numero_licencia = "El número de licencia es obligatorio";
  else if (!/^[A-Za-z0-9]{4,20}$/.test(numero_licencia.trim()))
    errores.numero_licencia = "Entre 4 y 20 letras o números";
  if (vacio(fecha_alta_licencia)) errores.fecha_alta_licencia = "La fecha de alta es obligatoria";
  else if (fecha_alta_licencia > hoy) errores.fecha_alta_licencia = "No puede ser una fecha futura";
  if (vacio(fecha_vencimiento_licencia))
    errores.fecha_vencimiento_licencia = "La fecha de vencimiento es obligatoria";
  else if (fecha_alta_licencia && fecha_vencimiento_licencia <= fecha_alta_licencia)
    errores.fecha_vencimiento_licencia = "Debe ser posterior a la fecha de alta";
  return errores;
}

export function validarViaje(datos, conductores = []) {
  const { vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros, observaciones } =
    datos;
  const errores = {};
  if (vacio(vehiculo_id)) errores.vehiculo_id = "Seleccione un vehículo";
  if (vacio(conductor_id)) errores.conductor_id = "Seleccione un conductor";
  if (vacio(fecha_salida)) errores.fecha_salida = "La fecha de salida es obligatoria";
  if (vacio(fecha_llegada)) errores.fecha_llegada = "La fecha de llegada es obligatoria";
  else if (fecha_salida && fecha_llegada < fecha_salida)
    errores.fecha_llegada = "No puede ser anterior a la salida";
  if (vacio(origen)) errores.origen = "El origen es obligatorio";
  else if (origen.trim().length > 100) errores.origen = "Máximo 100 caracteres";
  if (vacio(destino)) errores.destino = "El destino es obligatorio";
  else if (destino.trim().length > 100) errores.destino = "Máximo 100 caracteres";
  if (vacio(kilometros)) errores.kilometros = "Los kilómetros son obligatorios";
  else if (!(Number(kilometros) > 0)) errores.kilometros = "Debe ser un número mayor a 0";
  if ((observaciones ?? "").length > 500) errores.observaciones = "Máximo 500 caracteres";

  // Licencia vigente en la fecha de salida
  const conductor = conductores.find((c) => String(c.id) === String(conductor_id));
  if (conductor && fecha_salida && !errores.conductor_id) {
    const dia = fecha_salida.slice(0, 10);
    if (dia < conductor.fecha_alta_licencia || dia > conductor.fecha_vencimiento_licencia)
      errores.conductor_id = "La licencia del conductor no está vigente en la fecha de salida";
  }
  return errores;
}
