import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

function getSQL() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error("Database URL not configured")
  return neon(databaseUrl)
}

const GRANULARIDADES = ["day", "month", "year"] as const
type Granularidad = (typeof GRANULARIDADES)[number]

function truncar(fecha: Date, granularidad: Granularidad): Date {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()))
  if (granularidad === "year") return new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  if (granularidad === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  return d
}

function incrementar(fecha: Date, granularidad: Granularidad): Date {
  const d = new Date(fecha)
  if (granularidad === "year") d.setUTCFullYear(d.getUTCFullYear() + 1)
  else if (granularidad === "month") d.setUTCMonth(d.getUTCMonth() + 1)
  else d.setUTCDate(d.getUTCDate() + 1)
  return d
}

// Enumera todos los períodos entre desde/hasta (inclusive), con ceros donde no hubo
// ventas, para que el gráfico muestre el rango completo (mismo patrón que Sindic).
function enumerarPeriodos(desde: Date, hasta: Date, granularidad: Granularidad): Date[] {
  const periodos: Date[] = []
  let cursor = truncar(desde, granularidad)
  const fin = truncar(hasta, granularidad)
  let guard = 0
  while (cursor.getTime() <= fin.getTime() && guard < 3660) {
    periodos.push(new Date(cursor))
    cursor = incrementar(cursor, granularidad)
    guard++
  }
  return periodos
}

// Evolución de ventas agrupada por día/mes/año. movimientos.fecha ya es una columna
// DATE pura (sin hora), a diferencia de Sindic (donde Sale.createdAt es un timestamp
// real y hay que restar el offset de Argentina antes de truncar) -- acá alcanza con
// date_trunc directo, sin ajuste de huso horario.
export async function GET(request: NextRequest) {
  try {
    const sql = getSQL()
    const { searchParams } = new URL(request.url)
    const granularidadParam = searchParams.get("granularity") ?? "day"
    if (!GRANULARIDADES.includes(granularidadParam as Granularidad)) {
      return NextResponse.json(
        { error: `granularity debe ser una de: ${GRANULARIDADES.join(", ")}` },
        { status: 400 },
      )
    }
    const granularidad = granularidadParam as Granularidad
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    const hastaDia = toParam ? new Date(`${toParam}T00:00:00.000Z`) : new Date()
    const desdeDia = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : new Date(hastaDia.getTime() - 30 * 86_400_000)

    const from = fromParam || desdeDia.toISOString().slice(0, 10)
    const to = toParam || hastaDia.toISOString().slice(0, 10)

    const rows = await sql`
      SELECT date_trunc(${granularidad}, fecha) as periodo,
             SUM(total) as total,
             COUNT(*) as cantidad
      FROM movimientos
      WHERE tipo = 'venta' AND estado = 'completado' AND fecha BETWEEN ${from} AND ${to}
      GROUP BY periodo
      ORDER BY periodo ASC
    `

    const porPeriodo = new Map(
      rows.map((r: any) => [
        truncar(new Date(r.periodo), granularidad).getTime(),
        { total: Number(r.total ?? 0), cantidad: Number(r.cantidad) },
      ]),
    )

    const serie = enumerarPeriodos(desdeDia, hastaDia, granularidad).map((periodo) => {
      const match = porPeriodo.get(periodo.getTime())
      return {
        period: periodo.toISOString(),
        totalFacturado: match?.total ?? 0,
        cantidadVentas: match?.cantidad ?? 0,
      }
    })

    return NextResponse.json({ granularity: granularidad, from, to, serie })
  } catch (error: any) {
    console.error("[v0] Error fetching ventas-evolucion:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
