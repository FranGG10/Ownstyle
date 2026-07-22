import { neon } from "@neondatabase/serverless"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const sql = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(request.url)
  
  const marca = searchParams.get("marca")
  const modelo = searchParams.get("modelo")
  const talle = searchParams.get("talle")

  try {
    // Obtener marcas únicas para el filtro
    const marcas = await sql`
      SELECT DISTINCT marca FROM productos WHERE activo = true ORDER BY marca
    `

    // Obtener modelos únicos (filtrado por marca si se seleccionó)
    let modelos
    if (marca) {
      modelos = await sql`
        SELECT DISTINCT modelo FROM productos WHERE activo = true AND marca = ${marca} ORDER BY modelo
      `
    } else {
      modelos = await sql`
        SELECT DISTINCT modelo FROM productos WHERE activo = true ORDER BY modelo
      `
    }

    // Obtener talles únicos (filtrado por marca y modelo si se seleccionaron)
    let talles
    if (marca && modelo) {
      talles = await sql`
        SELECT DISTINCT talle FROM productos 
        WHERE activo = true AND marca = ${marca} AND modelo = ${modelo} 
        ORDER BY talle
      `
    } else if (marca) {
      talles = await sql`
        SELECT DISTINCT talle FROM productos 
        WHERE activo = true AND marca = ${marca} 
        ORDER BY talle
      `
    } else {
      talles = await sql`
        SELECT DISTINCT talle FROM productos WHERE activo = true ORDER BY talle
      `
    }

    // Si hay filtros completos, obtener el historial del producto
    let historial: any[] = []
    let producto = null
    
    if (marca && modelo && talle) {
      // Buscar el producto
      const [prod] = await sql`
        SELECT id_producto, codigo_sku, descripcion, marca, modelo, color, talle, stock_actual, costo
        FROM productos 
        WHERE marca = ${marca} AND modelo = ${modelo} AND talle = ${talle} AND activo = true
        LIMIT 1
      `
      producto = prod

      if (producto) {
        // Obtener historial de movimientos de stock
        historial = await sql`
          SELECT 
            sm.id_stock_mov,
            sm.tipo,
            sm.cantidad,
            sm.stock_anterior,
            sm.stock_nuevo,
            sm.motivo,
            sm.fecha,
            m.numero_comprobante,
            CASE 
              WHEN m.tipo = 'venta' THEN 'Venta'
              WHEN m.tipo = 'compra' THEN 'Compra'
              ELSE INITCAP(sm.tipo)
            END as tipo_movimiento
          FROM stock_movimientos sm
          LEFT JOIN movimientos m ON sm.id_movimiento = m.id_movimiento
          WHERE sm.id_producto = ${producto.id_producto}
          ORDER BY sm.fecha DESC, sm.id_stock_mov DESC
        `
      }
    }

    return NextResponse.json({
      marcas: marcas.map((m: any) => m.marca),
      modelos: modelos.map((m: any) => m.modelo),
      talles: talles.map((t: any) => t.talle),
      producto,
      historial,
    })
  } catch (error: any) {
    console.error("Error en historial:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
