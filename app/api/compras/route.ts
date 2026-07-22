import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fechaDesde = searchParams.get("fechaDesde")
  const fechaHasta = searchParams.get("fechaHasta")

  try {
    let comprasQuery = `
      SELECT m.*, p.razon_social as proveedor_nombre
      FROM movimientos m
      LEFT JOIN proveedores p ON m.id_proveedor = p.id_proveedor
      WHERE m.tipo = 'compra'
    `

    let statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'completado') as completadas,
        COALESCE(SUM(total) FILTER (WHERE estado = 'completado'), 0) as total_compras,
        COALESCE(SUM(total) FILTER (WHERE estado = 'completado' AND fecha >= date_trunc('month', CURRENT_DATE)), 0) as compras_mes
      FROM movimientos
      WHERE tipo = 'compra'
    `

    const params: string[] = []
    let paramIndex = 1

    if (fechaDesde) {
      comprasQuery += ` AND m.fecha >= $${paramIndex}`
      statsQuery += ` AND fecha >= $${paramIndex}`
      params.push(fechaDesde)
      paramIndex++
    }

    if (fechaHasta) {
      comprasQuery += ` AND m.fecha <= $${paramIndex}`
      statsQuery += ` AND fecha <= $${paramIndex}`
      params.push(fechaHasta)
      paramIndex++
    }

    comprasQuery += ` ORDER BY m.created_at DESC`

    // Ejecutar queries con parámetros
    let compras, stats

    if (params.length === 0) {
      compras = await sql.query(comprasQuery)
      const statsResult = await sql.query(statsQuery)
      stats = statsResult[0]
    } else if (params.length === 1) {
      compras = await sql.query(comprasQuery, [params[0]])
      const statsResult = await sql.query(statsQuery, [params[0]])
      stats = statsResult[0]
    } else {
      compras = await sql.query(comprasQuery, [params[0], params[1]])
      const statsResult = await sql.query(statsQuery, [params[0], params[1]])
      stats = statsResult[0]
    }

    return NextResponse.json({
      compras: compras || [],
      stats: {
        total: Number(stats?.total || 0),
        completadas: Number(stats?.completadas || 0),
        totalCompras: Number(stats?.total_compras || 0),
        comprasMes: Number(stats?.compras_mes || 0),
      },
    })
  } catch (error) {
    console.error("Error fetching compras:", error)
    return NextResponse.json({ error: "Error fetching compras" }, { status: 500 })
  }
}
