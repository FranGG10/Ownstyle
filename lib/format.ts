const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount)
}

// Las fechas de venta/compra/etc. son columnas DATE (sin hora) - representan
// un día calendario puro, sin zona horaria. JS las parsea como medianoche
// UTC; si se muestran sin fijar timeZone, el navegador las corre a su huso
// horario local y el día calendario puede quedar un día antes/después según
// la hora. Por eso acá se fuerza timeZone: "UTC" - así el día que se guardó
// es siempre el día que se muestra, sin importar dónde se abra el sistema.
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date))
}

// created_at y similares sí son timestamps reales (con hora) - a diferencia
// de formatDate, acá conviene mostrar la hora de Argentina siempre, sin
// importar en qué huso horario corra el navegador o el servidor.
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA_ARGENTINA,
  }).format(new Date(date))
}

// Fecha de "hoy" en formato YYYY-MM-DD, calculada en huso horario argentino
// (no en UTC ni en el huso del navegador/servidor) - para usar como valor
// por defecto en formularios de fecha.
export function hoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: ZONA_ARGENTINA })
}

// Igual que hoyArgentina, pero para convertir un Date ya calculado (ej. "hace
// 7 días") al mismo formato YYYY-MM-DD en huso horario argentino.
export function fechaAISO(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: ZONA_ARGENTINA })
}
