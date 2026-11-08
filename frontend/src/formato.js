// Utilidades de formato para mostrar datos en pantalla

export const formatearKm = (km) =>
  `${Number(km ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })} km`;

// "2026-11-02" -> "02/11/2026"
export const formatearFecha = (fecha) => {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
};

// "2026-11-02 06:30:00" -> "02/11/2026 06:30"
export const formatearFechaHora = (fechaHora) => {
  if (!fechaHora) return "";
  return `${formatearFecha(fechaHora)} ${fechaHora.slice(11, 16)}`;
};

// "2026-11-02 06:30:00" -> "2026-11-02T06:30" (valor de un input datetime-local)
export const aInputFechaHora = (fechaHora) => (fechaHora ? fechaHora.replace(" ", "T").slice(0, 16) : "");
