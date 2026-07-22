import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const mesActualInicio = `date_trunc('month', CURRENT_DATE)`
    const mesActualFin = `date_trunc('month', CURRENT_DATE) + interval '1 month'`
    const mesPasadoInicio = `date_trunc('month', CURRENT_DATE) - interval '1 month'`
    const mesPasadoFin = `date_trunc('month', CURRENT_DATE)`

    // 1a. Ventas mes actual (total facturado - sin JOIN para evitar duplicados)
    const [ventasTotalMesActual] = await sql`
      SELECT COALESCE(SUM(total), 0) as total_ventas
      FROM movimientos
      WHERE tipo = 'venta' AND estado = 'completado'
      AND fecha >= date_trunc('month', CURRENT_DATE)
      AND fecha < date_trunc('month', CURRENT_DATE) + interval '1 month'
    `

    // 1b. Unidades y CMV mes actual (desde detalle)
    const [detalleMesActual] = await sql`
      SELECT 
        COALESCE(SUM(md.cantidad), 0) as unidades_vendidas,
        COALESCE(SUM(md.cantidad * p.costo), 0) as cmv
      FROM movimientos m
      JOIN movimientos_detalle md ON m.id_movimiento = md.id_movimiento
      JOIN productos p ON md.id_producto = p.id_producto
      WHERE m.tipo = 'venta' AND m.estado = 'completado'
      AND m.fecha >= date_trunc('month', CURRENT_DATE)
      AND m.fecha < date_trunc('month', CURRENT_DATE) + interval '1 month'
    `

    const ventasMesActual = {
      total_ventas: ventasTotalMesActual.total_ventas,
      unidades_vendidas: detalleMesActual.unidades_vendidas,
      cmv: detalleMesActual.cmv,
    }

    // 2a. Ventas mes pasado (total facturado - sin JOIN)
    const [ventasTotalMesPasado] = await sql`
      SELECT COALESCE(SUM(total), 0) as total_ventas
      FROM movimientos
      WHERE tipo = 'venta' AND estado = 'completado'
      AND fecha >= date_trunc('month', CURRENT_DATE) - interval '1 month'
      AND fecha < date_trunc('month', CURRENT_DATE)
    `

    // 2b. Unidades y CMV mes pasado (desde detalle)
    const [detalleMesPasado] = await sql`
      SELECT 
        COALESCE(SUM(md.cantidad), 0) as unidades_vendidas,
        COALESCE(SUM(md.cantidad * p.costo), 0) as cmv
      FROM movimientos m
      JOIN movimientos_detalle md ON m.id_movimiento = md.id_movimiento
      JOIN productos p ON md.id_producto = p.id_producto
      WHERE m.tipo = 'venta' AND m.estado = 'completado'
      AND m.fecha >= date_trunc('month', CURRENT_DATE) - interval '1 month'
      AND fecha < date_trunc('month', CURRENT_DATE)
    `

    const ventasMesPasado = {
      total_ventas: ventasTotalMesPasado.total_ventas,
      unidades_vendidas: detalleMesPasado.unidades_vendidas,
      cmv: detalleMesPasado.cmv,
    }

    // 3. Stock valorizado actual (fin de mes = ahora)
    const [stockActual] = await sql`
      SELECT COALESCE(SUM(stock_actual * costo), 0) as stock_valorizado
      FROM productos WHERE activo = true
    `

    // 4. Stock valorizado inicio del mes (reconstruir sumando las salidas y restando las entradas del mes)
    // Stock inicio mes = Stock actual + ventas del mes (en unidades*costo) - compras del mes (en unidades*costo)
    const [movStockMes] = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN m.tipo = 'venta' THEN md.cantidad * p.costo ELSE 0 END), 0) as salidas_costo,
        COALESCE(SUM(CASE WHEN m.tipo = 'compra' THEN md.cantidad * p.costo ELSE 0 END), 0) as entradas_costo
      FROM movimientos m
      JOIN movimientos_detalle md ON m.id_movimiento = md.id_movimiento
      JOIN productos p ON md.id_producto = p.id_producto
      WHERE m.estado = 'completado'
      AND m.fecha >= date_trunc('month', CURRENT_DATE)
      AND m.fecha < date_trunc('month', CURRENT_DATE) + interval '1 month'
    `

    // 5. Top modelos vendidos (por marca + modelo)
    const topModelos = await sql`
      SELECT 
        p.marca,
        p.modelo,
        SUM(md.cantidad) as unidades_vendidas,
        SUM(md.cantidad * md.precio_unitario) as total_vendido
      FROM movimientos m
      JOIN movimientos_detalle md ON m.id_movimiento = md.id_movimiento
      JOIN productos p ON md.id_producto = p.id_producto
      WHERE m.tipo = 'venta' AND m.estado = 'completado'
      AND m.fecha >= date_trunc('month', CURRENT_DATE)
      AND m.fecha < date_trunc('month', CURRENT_DATE) + interval '1 month'
      GROUP BY p.marca, p.modelo
      ORDER BY unidades_vendidas DESC
    `

    // 6. Top modelos historico (para ver tendencia general)
    const topModelosHistorico = await sql`
      SELECT 
        p.marca,
        p.modelo,
        SUM(md.cantidad) as unidades_vendidas,
        SUM(md.cantidad * md.precio_unitario) as total_vendido
      FROM movimientos m
      JOIN movimientos_detalle md ON m.id_movimiento = md.id_movimiento
      JOIN productos p ON md.id_producto = p.id_producto
      WHERE m.tipo = 'venta' AND m.estado = 'completado'
      GROUP BY p.marca, p.modelo
      ORDER BY unidades_vendidas DESC
    `

    // Calculos
    const ventasActual = Number(ventasMesActual.total_ventas)
    const ventasPasado = Number(ventasMesPasado.total_ventas)
    const unidadesActual = Number(ventasMesActual.unidades_vendidas)
    const unidadesPasado = Number(ventasMesPasado.unidades_vendidas)
    const cmvActual = Number(ventasMesActual.cmv)
    const cmvPasado = Number(ventasMesPasado.cmv)
    
    const stockFinMes = Number(stockActual.stock_valorizado)
    const salidasCosto = Number(movStockMes.salidas_costo)
    const entradasCosto = Number(movStockMes.entradas_costo)
    const stockInicioMes = stockFinMes + salidasCosto - entradasCosto
    const stockPromedio = (stockInicioMes + stockFinMes) / 2

    // Variaciones
    const variacionVentas = ventasPasado > 0 ? ((ventasActual - ventasPasado) / ventasPasado) * 100 : null
    const variacionUnidades = unidadesPasado > 0 ? ((unidadesActual - unidadesPasado) / unidadesPasado) * 100 : null

    // Margen bruto mensual
    const margenBrutoMes = ventasActual > 0 ? ((ventasActual - cmvActual) / ventasActual) * 100 : 0
    const margenBrutoMesPasado = ventasPasado > 0 ? ((ventasPasado - cmvPasado) / ventasPasado) * 100 : 0

    // Rotacion de stock
    const rotacionStock = stockPromedio > 0 ? cmvActual / stockPromedio : 0

    // Dias de stock
    const diasStock = cmvActual > 0 ? (stockPromedio / cmvActual) * 30 : 0

    return NextResponse.json({
      ventas: {
        mesActual: ventasActual,
        mesPasado: ventasPasado,
        variacionMensual: variacionVentas,
        variacionAnual: null, // Primer año, no hay comparación
      },
      unidades: {
        mesActual: unidadesActual,
        mesPasado: unidadesPasado,
        variacionMensual: variacionUnidades,
      },
      margenBruto: {
        porcentajeMesActual: margenBrutoMes,
        porcentajeMesPasado: margenBrutoMesPasado,
        montoMesActual: ventasActual - cmvActual,
      },
      rotacionStock: {
        valor: rotacionStock,
        stockPromedio,
        cmvMensual: cmvActual,
      },
      diasStock: {
        valor: diasStock,
        stockPromedio,
        cmvMensual: cmvActual,
      },
      topModelos: topModelos.map((m: any) => ({
        marca: m.marca,
        modelo: m.modelo,
        unidadesVendidas: Number(m.unidades_vendidas),
        totalVendido: Number(m.total_vendido),
      })),
      topModelosHistorico: topModelosHistorico.map((m: any) => ({
        marca: m.marca,
        modelo: m.modelo,
        unidadesVendidas: Number(m.unidades_vendidas),
        totalVendido: Number(m.total_vendido),
      })),
    })
  } catch (error: any) {
    console.error("Error fetching indicadores:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
