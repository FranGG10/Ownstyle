import { neon } from "@neondatabase/serverless"
import { NextRequest, NextResponse } from "next/server"

const NOMBRE_COMPROBANTE: Record<number, string> = {
  1: "Factura A",
  6: "Factura B",
  11: "Factura C",
}

export async function GET(request: NextRequest) {
  const sql = neon(process.env.DATABASE_URL!)
  const searchParams = request.nextUrl.searchParams
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  try {
    const facturas = await sql`
      SELECT
        f.id_factura, f.id_movimiento, f.tipo_comprobante, f.punto_venta, f.numero_comprobante,
        f.cae, f.cae_vencimiento, f.imp_neto, f.imp_iva, f.importe_total,
        m.fecha, m.numero_comprobante as venta_numero_comprobante,
        COALESCE(c.razon_social, m.nombre_cliente, 'Consumidor Final') as cliente_nombre
      FROM facturas f
      JOIN movimientos m ON m.id_movimiento = f.id_movimiento
      LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
      WHERE m.fecha >= ${desde}::date AND m.fecha <= ${hasta}::date
      ORDER BY m.fecha DESC, f.id_factura DESC
    `

    const [totales] = await sql`
      SELECT
        COUNT(*) as cantidad,
        COALESCE(SUM(f.imp_neto), 0) as total_neto,
        COALESCE(SUM(f.imp_iva), 0) as total_iva,
        COALESCE(SUM(f.importe_total), 0) as total_general
      FROM facturas f
      JOIN movimientos m ON m.id_movimiento = f.id_movimiento
      WHERE m.fecha >= ${desde}::date AND m.fecha <= ${hasta}::date
    `

    return NextResponse.json({
      facturas: facturas.map((f: any) => ({
        ...f,
        tipo_comprobante_nombre: NOMBRE_COMPROBANTE[f.tipo_comprobante] || `Comprobante ${f.tipo_comprobante}`,
      })),
      totales: {
        cantidad: Number(totales?.cantidad || 0),
        total_neto: Number(totales?.total_neto || 0),
        total_iva: Number(totales?.total_iva || 0),
        total_general: Number(totales?.total_general || 0),
      },
    })
  } catch (error: any) {
    console.error("Error en reporte de facturación:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
