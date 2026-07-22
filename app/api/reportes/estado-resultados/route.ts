import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Estado de Resultados de Ownstyle, consumido por Sindic para armar el consolidado.
// Mismo cálculo que el "Libro Mayor" de /api/contabilidad (ingresos = haber - debe,
// gastos = debe - haber), pero devuelto en el mismo shape que usa Sindic para sus
// propios reportes, así el otro sistema puede sumarlos línea a línea sin transformar nada.
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key")
  const expectedKey = process.env.SINDIC_REPORTS_API_KEY
  if (!expectedKey || !apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  try {
    const rows =
      from && to
        ? await sql`
          SELECT pc.codigo, pc.nombre, pc.tipo,
            COALESCE(SUM(ad.debe), 0) as total_debe,
            COALESCE(SUM(ad.haber), 0) as total_haber
          FROM plan_cuentas pc
          JOIN asientos_detalle ad ON ad.id_cuenta = pc.id_cuenta
          JOIN asientos a ON a.id_asiento = ad.id_asiento
          WHERE pc.es_imputable = true AND pc.tipo IN ('ingreso', 'gasto')
            AND a.fecha >= ${from} AND a.fecha <= ${to}
          GROUP BY pc.id_cuenta, pc.codigo, pc.nombre, pc.tipo
          ORDER BY pc.codigo
        `
        : await sql`
          SELECT pc.codigo, pc.nombre, pc.tipo,
            COALESCE(SUM(ad.debe), 0) as total_debe,
            COALESCE(SUM(ad.haber), 0) as total_haber
          FROM plan_cuentas pc
          JOIN asientos_detalle ad ON ad.id_cuenta = pc.id_cuenta
          JOIN asientos a ON a.id_asiento = ad.id_asiento
          WHERE pc.es_imputable = true AND pc.tipo IN ('ingreso', 'gasto')
          GROUP BY pc.id_cuenta, pc.codigo, pc.nombre, pc.tipo
          ORDER BY pc.codigo
        `

    const ingresos: { code: string; name: string; amount: number }[] = []
    const gastos: { code: string; name: string; amount: number }[] = []

    for (const r of rows) {
      const debe = Number(r.total_debe)
      const haber = Number(r.total_haber)
      if (debe === 0 && haber === 0) continue
      if (r.tipo === "ingreso") {
        ingresos.push({ code: r.codigo, name: r.nombre, amount: haber - debe })
      } else {
        gastos.push({ code: r.codigo, name: r.nombre, amount: debe - haber })
      }
    }

    const totalIngresos = ingresos.reduce((s, i) => s + i.amount, 0)
    const totalGastos = gastos.reduce((s, g) => s + g.amount, 0)

    return NextResponse.json({
      from,
      to,
      ingresos,
      gastos,
      totalIngresos,
      totalGastos,
      resultadoNeto: totalIngresos - totalGastos,
    })
  } catch (error) {
    console.error("[v0] Error en estado-resultados:", error)
    return NextResponse.json({ error: "Error al calcular el estado de resultados" }, { status: 500 })
  }
}
