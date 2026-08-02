import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

function getSQL() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error("Database URL not configured")
  return neon(databaseUrl)
}

interface DetalleCuenta {
  codigo: string
  nombre: string
  monto: number
}

interface Metrics {
  ventas: number
  costosFijos: { total: number; detalle: DetalleCuenta[] }
  costosVariables: { total: number; detalle: DetalleCuenta[] }
  margenContribucionPct: number
  ventasEquilibrio: number
  resultado: number
  estado: "rentable" | "empate" | "pierde" | "sin_datos"
}

async function computeMetrics(from: string, to: string): Promise<Metrics> {
  const sql = getSQL()
  const [ventasRow] = await sql`
    SELECT COALESCE(SUM(ad.haber - ad.debe), 0) as ventas_netas
    FROM asientos_detalle ad
    JOIN asientos a ON ad.id_asiento = a.id_asiento
    JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
    WHERE pc.codigo = '4.1' AND a.fecha BETWEEN ${from} AND ${to}
  `

  const costos = await sql`
    SELECT pc.codigo, pc.nombre, COALESCE(pc.comportamiento, 'fijo') as comportamiento,
           SUM(ad.debe - ad.haber) as monto
    FROM asientos_detalle ad
    JOIN asientos a ON ad.id_asiento = a.id_asiento
    JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
    WHERE pc.tipo = 'gasto' AND a.fecha BETWEEN ${from} AND ${to}
    GROUP BY pc.codigo, pc.nombre, COALESCE(pc.comportamiento, 'fijo')
    HAVING SUM(ad.debe - ad.haber) != 0
    ORDER BY pc.codigo
  `

  const ventas = Number(ventasRow.ventas_netas)

  const detalleVariables: DetalleCuenta[] = costos
    .filter((r: any) => r.comportamiento === "variable")
    .map((r: any) => ({ codigo: r.codigo, nombre: r.nombre, monto: Number(r.monto) }))
  const detalleFijos: DetalleCuenta[] = costos
    .filter((r: any) => r.comportamiento === "fijo")
    .map((r: any) => ({ codigo: r.codigo, nombre: r.nombre, monto: Number(r.monto) }))

  const costosVariablesTotal = detalleVariables.reduce((acc, d) => acc + d.monto, 0)
  const costosFijosTotal = detalleFijos.reduce((acc, d) => acc + d.monto, 0)

  const margenContribucionPct = ventas > 0 ? ((ventas - costosVariablesTotal) / ventas) * 100 : 0
  const ventasEquilibrio = margenContribucionPct > 0 ? costosFijosTotal / (margenContribucionPct / 100) : 0
  const resultado = ventas - costosVariablesTotal - costosFijosTotal

  let estado: Metrics["estado"] = "sin_datos"
  if (ventas > 0 && margenContribucionPct > 0) {
    if (ventas > ventasEquilibrio * 1.02) estado = "rentable"
    else if (ventas < ventasEquilibrio * 0.98) estado = "pierde"
    else estado = "empate"
  }

  return {
    ventas,
    costosFijos: { total: costosFijosTotal, detalle: detalleFijos },
    costosVariables: { total: costosVariablesTotal, detalle: detalleVariables },
    margenContribucionPct,
    ventasEquilibrio,
    resultado,
    estado,
  }
}

function periodoAnterior(from: string, to: string): { from: string; to: string } {
  const desde = new Date(`${from}T00:00:00.000Z`)
  const hasta = new Date(`${to}T00:00:00.000Z`)
  const dias = Math.round((hasta.getTime() - desde.getTime()) / 86_400_000) + 1
  const nuevaHasta = new Date(desde.getTime() - 86_400_000)
  const nuevaDesde = new Date(nuevaHasta.getTime() - (dias - 1) * 86_400_000)
  return {
    from: nuevaDesde.toISOString().slice(0, 10),
    to: nuevaHasta.toISOString().slice(0, 10),
  }
}

function pctChange(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

function rangoPorDefecto() {
  const hoy = new Date()
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { from: iso(desde), to: iso(hoy) }
}

// Punto de Equilibrio calculado 100% con datos ya cargados a mano en Ownstyle
// (asientos_detalle + plan_cuentas.comportamiento). A diferencia de Sindic, acá el
// "estado" (rentable/empate/pierde) se calcula comparando Ventas reales vs. Ventas de
// Equilibrio directamente -- no hay ROAS todavía (Francisco todavía no pasó el token
// de la plataforma de ads, ver CLAUDE.md), así que no se puede comparar ROAS actual
// vs. ROAS de equilibrio como hace Sindic.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const defaults = rangoPorDefecto()
    const from = searchParams.get("from") || defaults.from
    const to = searchParams.get("to") || defaults.to

    const anterior = periodoAnterior(from, to)

    const [actualMetrics, anteriorMetrics] = await Promise.all([
      computeMetrics(from, to),
      computeMetrics(anterior.from, anterior.to),
    ])

    return NextResponse.json({
      from,
      to,
      actual: actualMetrics,
      anterior: { ...anteriorMetrics, from: anterior.from, to: anterior.to },
      variacion: {
        ventas: pctChange(actualMetrics.ventas, anteriorMetrics.ventas),
        resultado: pctChange(actualMetrics.resultado, anteriorMetrics.resultado),
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching punto-equilibrio:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
