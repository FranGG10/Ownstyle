import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Balance General de Ownstyle a una fecha dada, consumido por Sindic para el consolidado.
// Mismo shape que el balance de Sindic (activo/pasivo/patrimonio + totales), con el
// resultado del ejercicio agregado como línea de patrimonio para que activo = pasivo + patrimonio.
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key")
  const expectedKey = process.env.SINDIC_REPORTS_API_KEY
  if (!expectedKey || !apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const asOfParam = searchParams.get("asOf")
  const asOf = asOfParam || new Date().toISOString().slice(0, 10)

  try {
    const rows = await sql`
      SELECT pc.codigo, pc.nombre, pc.tipo,
        COALESCE(SUM(ad.debe), 0) as total_debe,
        COALESCE(SUM(ad.haber), 0) as total_haber
      FROM plan_cuentas pc
      JOIN asientos_detalle ad ON ad.id_cuenta = pc.id_cuenta
      JOIN asientos a ON a.id_asiento = ad.id_asiento
      WHERE a.fecha <= ${asOf}
      GROUP BY pc.id_cuenta, pc.codigo, pc.nombre, pc.tipo
      ORDER BY pc.codigo
    `

    type Row = { code: string; name: string; balance: number }
    const activo: Row[] = []
    const pasivo: Row[] = []
    const patrimonio: Row[] = []
    let totalIngresos = 0
    let totalGastos = 0

    for (const r of rows) {
      const debe = Number(r.total_debe)
      const haber = Number(r.total_haber)
      if (debe === 0 && haber === 0) continue

      if (r.tipo === "activo") activo.push({ code: r.codigo, name: r.nombre, balance: debe - haber })
      else if (r.tipo === "pasivo") pasivo.push({ code: r.codigo, name: r.nombre, balance: haber - debe })
      else if (r.tipo === "patrimonio") patrimonio.push({ code: r.codigo, name: r.nombre, balance: haber - debe })
      else if (r.tipo === "ingreso") totalIngresos += haber - debe
      else if (r.tipo === "gasto") totalGastos += debe - haber
    }

    patrimonio.push({
      code: "-",
      name: "Resultado del ejercicio (no distribuido)",
      balance: totalIngresos - totalGastos,
    })

    const totalActivo = activo.reduce((s, a) => s + a.balance, 0)
    const totalPasivo = pasivo.reduce((s, p) => s + p.balance, 0)
    const totalPatrimonio = patrimonio.reduce((s, p) => s + p.balance, 0)

    return NextResponse.json({
      asOf,
      activo,
      pasivo,
      patrimonio,
      totalActivo,
      totalPasivo,
      totalPatrimonio,
      diferencia: totalActivo - (totalPasivo + totalPatrimonio),
    })
  } catch (error) {
    console.error("[v0] Error en balance:", error)
    return NextResponse.json({ error: "Error al calcular el balance" }, { status: 500 })
  }
}
