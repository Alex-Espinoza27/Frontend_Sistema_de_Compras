// Utilidades de fecha compartidas (05C hardening). Todo el codebase evita
// parseo UTC para fechas "de calendario" (filtros, formularios) — se usan
// siempre los getters/constructor LOCALES del navegador, para no introducir
// un corrimiento de día según el huso horario (mismo criterio que
// `BaseDatePicker`/`BaseRangoFechas`).

/** Fecha (sin hora) → string `YYYY-MM-DD`. */
export function aTextoFecha(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** Hoy, como string `YYYY-MM-DD` — valor por defecto de los filtros de fecha
 * que piden arrancar marcados en "Hoy" (05C hardening, pedido explícitamente
 * por el usuario en Requerimientos/Convocatorias/Presentación de
 * Ofertas/Evaluación/Adjudicación/Auditoría). */
export function hoyTexto(): string {
  return aTextoFecha(new Date())
}
