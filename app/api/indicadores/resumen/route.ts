import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

function getSQL() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error("Database URL not configured")
  return neon(databaseUrl)
}

// Rango por defecto: mes actual (mismo criterio que ya usa /api/indicadores).
function rangoPorDefecto() {
  const hoy = new Date()
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { from: iso(desde), to: iso(hoy) }
}

// Indicadores generales de Ownstyle, calculados 100% a partir de asientos_detalle +
// plan_cuentas.comportamiento (variable/fijo) -- el mismo patrón que usa Sindic con
// JournalLine + ChartOfAccount.costBehavior, pero contra el motor de asientos real
// que ya postea Ownstyle (ver createAsientoVenta en app/actions/ventas.ts y
// createIngresoEgreso en app/actions/ingresos-egresos.ts).
//
// Sin ROAS/CAC/gasto publicitario todavía: Francisco pidió dejarlos pendientes hasta
// pasar el token de la plataforma de ads (ver CLAUDE.md).
export async function GET(request: NextRequest) {
  try {
    const sql = getSQL()
    const { searchParams } = new URL(request.url)
    const defaults = rangoPorDefecto()
    const from = searchParams.get("from") || defaults.from
    const to = searchParams.get("to") || defaults.to

    const [ventasRow] = await sql`
      SELECT COALESCE(SUM(ad.haber - ad.debe), 0) as ventas_netas
      FROM asientos_detalle ad
      JOIN asientos a ON ad.id_asiento = a.id_asiento
      JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
      WHERE pc.codigo = '4.1' AND a.fecha BETWEEN ${from} AND ${to}
    `

    const [cmvRow] = await sql`
      SELECT COALESCE(SUM(ad.debe - ad.haber), 0) as cmv
      FROM asientos_detalle ad
      JOIN asientos a ON ad.id_asiento = a.id_asiento
      JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
      WHERE pc.codigo = '5.1' AND a.fecha BETWEEN ${from} AND ${to}
    `

    const costosPorComportamiento = await sql`
      SELECT COALESCE(pc.comportamiento, 'fijo') as comportamiento, SUM(ad.debe - ad.haber) as monto
      FROM asientos_detalle ad
      JOIN asientos a ON ad.id_asiento = a.id_asiento
      JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
      WHERE pc.tipo = 'gasto' AND a.fecha BETWEEN ${from} AND ${to}
      GROUP BY COALESCE(pc.comportamiento, 'fijo')
    `

    const [ingresosRow] = await sql`
      SELECT COALESCE(SUM(ad.haber - ad.debe), 0) as ingresos_totales
      FROM asientos_detalle ad
      JOIN asientos a ON ad.id_asiento = a.id_asiento
      JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
      WHERE pc.tipo = 'ingreso' AND a.fecha BETWEEN ${from} AND ${to}
    `

    const [ventasMov] = await sql`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as importe
      FROM movimientos
      WHERE tipo = 'venta' AND estado = 'completado' AND fecha BETWEEN ${from} AND ${to}
    `

    const ventasNetas = Number(ventasRow.ventas_netas)
    const cmv = Number(cmvRow.cmv)
    const costosVariables = costosPorComportamiento
      .filter((r: any) => r.comportamiento === "variable")
      .reduce((acc: number, r: any) => acc + Number(r.monto), 0)
    const costosFijos = costosPorComportamiento
      .filter((r: any) => r.comportamiento === "fijo")
      .reduce((acc: number, r: any) => acc + Number(r.monto), 0)
    const gastosTotales = costosVariables + costosFijos
    const ingresosTotales = Number(ingresosRow.ingresos_totales)
    const resultadoNeto = ingresosTotales - gastosTotales

    const cantidadVentas = Number(ventasMov.cantidad)
    const totalFacturado = Number(ventasMov.importe)
    const ticketPromedio = cantidadVentas > 0 ? totalFacturado / cantidadVentas : 0

    const margenBrutoPct = ventasNetas > 0 ? ((ventasNetas - cmv) / ventasNetas) * 100 : 0
    const margenContribucionPct = ventasNetas > 0 ? ((ventasNetas - costosVariables) / ventasNetas) * 100 : 0
    const margenNetoPct = ventasNetas > 0 ? ((ventasNetas - costosVariables - costosFijos) / ventasNetas) * 100 : 0

    const indicators = [
      { code: "total_facturado", label: "Total Facturado", value: totalFacturado, unit: "currency" },
      { code: "cantidad_ventas", label: "Cantidad de Ventas", value: cantidadVentas, unit: "number" },
      { code: "ticket_promedio", label: "Ticket Promedio", value: ticketPromedio, unit: "currency" },
      { code: "margen_bruto_pct", label: "Margen Bruto %", value: margenBrutoPct, unit: "percent" },
      { code: "margen_contribucion_pct", label: "Margen de Contribución %", value: margenContribucionPct, unit: "percent" },
      { code: "margen_neto_pct", label: "Margen Neto %", value: margenNetoPct, unit: "percent" },
      { code: "resultado_neto", label: "Resultado Neto", value: resultadoNeto, unit: "currency" },
    ]

    return NextResponse.json({ from, to, indicators })
  } catch (error: any) {
    console.error("[v0] Error fetching indicadores/resumen:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
