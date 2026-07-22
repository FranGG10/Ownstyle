import { neon } from "@neondatabase/serverless"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const sql = neon(process.env.DATABASE_URL!)
  const searchParams = request.nextUrl.searchParams
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  try {
    // Ingresos por ventas
    const [ventasData] = await sql`
      SELECT COALESCE(SUM(total), 0) as monto
      FROM movimientos
      WHERE tipo = 'venta' AND estado = 'completado'
      AND fecha >= ${desde}::date AND fecha <= ${hasta}::date
    `

    // Otros ingresos (del modulo ingresos_egresos)
    const otrosIngresos = await sql`
      SELECT categoria, COALESCE(SUM(monto), 0) as monto
      FROM ingresos_egresos
      WHERE tipo = 'ingreso'
      AND fecha >= ${desde}::date AND fecha <= ${hasta}::date
      GROUP BY categoria
    `

    // Egresos por compras
    const [comprasData] = await sql`
      SELECT COALESCE(SUM(total), 0) as monto
      FROM movimientos
      WHERE tipo = 'compra' AND estado = 'completado'
      AND fecha >= ${desde}::date AND fecha <= ${hasta}::date
    `

    // Otros egresos (del modulo ingresos_egresos)
    const otrosEgresos = await sql`
      SELECT categoria, COALESCE(SUM(monto), 0) as monto
      FROM ingresos_egresos
      WHERE tipo = 'egreso'
      AND fecha >= ${desde}::date AND fecha <= ${hasta}::date
      GROUP BY categoria
    `

    // Mapeo de categorias a nombres legibles
    const categoriaLabels: Record<string, string> = {
      publicidad: "Gastos de Publicidad",
      contador: "Honorarios Profesionales",
      impuestos: "Impuestos",
      gastos_varios: "Gastos Varios",
      flete: "Flete",
      alquiler: "Alquiler",
      auto: "Gastos Rodado",
      otros_ingresos: "Otros Ingresos",
    }

    // Construir detalle de ingresos
    const ingresos = []
    if (Number(ventasData.monto) > 0) {
      ingresos.push({ concepto: "Ventas", monto: ventasData.monto })
    }
    for (const oi of otrosIngresos) {
      ingresos.push({ 
        concepto: categoriaLabels[oi.categoria] || oi.categoria, 
        monto: oi.monto 
      })
    }

    // Construir detalle de egresos
    const egresos = []
    if (Number(comprasData.monto) > 0) {
      egresos.push({ concepto: "Compras de Mercaderia", monto: comprasData.monto })
    }
    for (const oe of otrosEgresos) {
      egresos.push({ 
        concepto: categoriaLabels[oe.categoria] || oe.categoria, 
        monto: oe.monto 
      })
    }

    // Calcular totales
    const totalIngresos = ingresos.reduce((sum, i) => sum + Number(i.monto), 0)
    const totalEgresos = egresos.reduce((sum, e) => sum + Number(e.monto), 0)
    const flujoNeto = totalIngresos - totalEgresos

    return NextResponse.json({
      ingresos,
      egresos,
      resumen: {
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        flujo_neto: flujoNeto,
      },
    })
  } catch (error: any) {
    console.error("Error en flujo de efectivo:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
