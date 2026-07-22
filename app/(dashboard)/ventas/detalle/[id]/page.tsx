import { Header } from "@/components/header"
import { VentaDetail } from "@/components/ventas/venta-detail"
import { sql } from "@/lib/db"
import { notFound } from "next/navigation"

async function getVenta(id: string) {
  const numericId = Number.parseInt(id, 10)
  if (isNaN(numericId)) return null

  try {
    const [venta] = await sql`
      SELECT m.*, c.razon_social as cliente_nombre, c.cuit as cliente_cuit
      FROM movimientos m
      LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
      WHERE m.id_movimiento = ${numericId} AND m.tipo = 'venta'
    `

    if (!venta) return null

    const detalles = await sql`
      SELECT md.*, p.codigo_sku, p.descripcion, p.marca, p.talle, p.color, p.modelo
      FROM movimientos_detalle md
      JOIN productos p ON md.id_producto = p.id_producto
      WHERE md.id_movimiento = ${numericId}
    `

    const asiento = await sql`
      SELECT a.*, ad.id_cuenta, ad.debe, ad.haber, pc.codigo, pc.nombre as cuenta_nombre
      FROM asientos a
      LEFT JOIN asientos_detalle ad ON a.id_asiento = ad.id_asiento
      LEFT JOIN plan_cuentas pc ON ad.id_cuenta = pc.id_cuenta
      WHERE a.id_movimiento = ${numericId}
    `

    return {
      ...venta,
      detalles: detalles || [],
      asiento: asiento || [],
    }
  } catch (error) {
    console.error("[v0] Error getting venta:", error)
    return null
  }
}

export default async function VentaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const numericId = Number.parseInt(id, 10)
  if (isNaN(numericId)) {
    notFound()
  }

  const venta = await getVenta(id)

  if (!venta) {
    notFound()
  }

  return (
    <div className="flex flex-col">
      <Header title="Detalle de Venta" />
      <div className="p-6">
        <VentaDetail venta={venta} />
      </div>
    </div>
  )
}
