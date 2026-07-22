import { neon } from "@neondatabase/serverless"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const sql = neon(process.env.DATABASE_URL!)
  const searchParams = request.nextUrl.searchParams
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  try {
    // Totales por proveedor (sin JOIN para evitar duplicados)
    const totalesPorProveedor = await sql`
      SELECT 
        p.id_proveedor,
        p.razon_social,
        COUNT(m.id_movimiento) as cantidad_compras,
        COALESCE(SUM(m.total), 0) as total_pagado
      FROM proveedores p
      LEFT JOIN movimientos m ON p.id_proveedor = m.id_proveedor 
        AND m.tipo = 'compra' 
        AND m.estado = 'completado'
        AND m.fecha >= ${desde}::date
        AND m.fecha <= ${hasta}::date
      WHERE p.activo = true
      GROUP BY p.id_proveedor, p.razon_social
      HAVING COUNT(m.id_movimiento) > 0
      ORDER BY SUM(m.total) DESC NULLS LAST
    `

    // Pares por proveedor (desde detalle)
    const paresPorProveedor = await sql`
      SELECT 
        m.id_proveedor,
        COALESCE(SUM(md.cantidad), 0) as total_pares
      FROM movimientos m
      JOIN movimientos_detalle md ON m.id_movimiento = md.id_movimiento
      WHERE m.tipo = 'compra' 
        AND m.estado = 'completado'
        AND m.fecha >= ${desde}::date
        AND m.fecha <= ${hasta}::date
      GROUP BY m.id_proveedor
    `

    const paresMap: Record<number, number> = {}
    for (const p of paresPorProveedor) {
      paresMap[p.id_proveedor] = Number(p.total_pares)
    }

    const proveedores = totalesPorProveedor.map((prov: any) => ({
      ...prov,
      total_pares: paresMap[prov.id_proveedor] || 0,
    }))

    // Totales generales (sin JOIN para el total_pagado)
    const [totalesCompras] = await sql`
      SELECT 
        COUNT(id_movimiento) as total_compras,
        COALESCE(SUM(total), 0) as total_pagado
      FROM movimientos
      WHERE tipo = 'compra' 
        AND estado = 'completado'
        AND fecha >= ${desde}::date
        AND fecha <= ${hasta}::date
    `

    const [totalesPares] = await sql`
      SELECT COALESCE(SUM(md.cantidad), 0) as total_pares
      FROM movimientos m
      JOIN movimientos_detalle md ON m.id_movimiento = md.id_movimiento
      WHERE m.tipo = 'compra' 
        AND m.estado = 'completado'
        AND m.fecha >= ${desde}::date
        AND m.fecha <= ${hasta}::date
    `

    const totales = {
      total_compras: totalesCompras?.total_compras || 0,
      total_pares: totalesPares?.total_pares || 0,
      total_pagado: totalesCompras?.total_pagado || 0,
    }

    return NextResponse.json({
      proveedores,
      totales: totales || { total_compras: 0, total_pares: 0, total_pagado: 0 },
    })
  } catch (error: any) {
    console.error("Error en reporte proveedores:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
