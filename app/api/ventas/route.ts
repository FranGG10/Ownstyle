import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fechaDesde = searchParams.get("fechaDesde")
  const fechaHasta = searchParams.get("fechaHasta")

  try {
    let ventasQuery = `
      SELECT m.*, c.razon_social as cliente_nombre, m.nombre_cliente, m.barrio, m.medio_pago
      FROM movimientos m
      LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
      WHERE m.tipo = 'venta'
    `

    let statsQuery = `
      SELECT 
        COUNT(*) as total,
        COALESCE((SELECT SUM(md.cantidad) FROM movimientos_detalle md INNER JOIN movimientos mv ON md.id_movimiento = mv.id_movimiento WHERE mv.tipo = 'venta' AND mv.estado = 'completado'), 0) as total_pares,
        COALESCE(SUM(total) FILTER (WHERE estado = 'completado'), 0) as total_ventas,
        COALESCE(SUM(total) FILTER (WHERE estado = 'completado' AND fecha >= date_trunc('month', CURRENT_DATE)), 0) as ventas_mes
      FROM movimientos
      WHERE tipo = 'venta'
    `

    const params: string[] = []
    let paramIndex = 1

    if (fechaDesde) {
      ventasQuery += ` AND m.fecha >= $${paramIndex}`
      statsQuery += ` AND fecha >= $${paramIndex}`
      params.push(fechaDesde)
      paramIndex++
    }

    if (fechaHasta) {
      ventasQuery += ` AND m.fecha <= $${paramIndex}`
      statsQuery += ` AND fecha <= $${paramIndex}`
      params.push(fechaHasta)
      paramIndex++
    }

    ventasQuery += ` ORDER BY m.created_at DESC`

    // Ejecutar queries con parámetros
    let ventas, stats

    if (params.length === 0) {
      ventas = await sql.query(ventasQuery)
      const statsResult = await sql.query(statsQuery)
      stats = statsResult[0]
    } else if (params.length === 1) {
      ventas = await sql.query(ventasQuery, [params[0]])
      const statsResult = await sql.query(statsQuery, [params[0]])
      stats = statsResult[0]
    } else {
      ventas = await sql.query(ventasQuery, [params[0], params[1]])
      const statsResult = await sql.query(statsQuery, [params[0], params[1]])
      stats = statsResult[0]
    }

    return NextResponse.json({
      ventas: ventas || [],
      stats: {
        total: Number(stats?.total || 0),
        totalPares: Number(stats?.total_pares || 0),
        totalVentas: Number(stats?.total_ventas || 0),
        ventasMes: Number(stats?.ventas_mes || 0),
      },
    })
  } catch (error) {
    console.error("Error fetching ventas:", error)
    return NextResponse.json({ error: "Error fetching ventas" }, { status: 500 })
  }
}
