import { Header } from "@/components/header"
import { CompraDetail } from "@/components/compras/compra-detail"
import { sql } from "@/lib/db"
import { notFound } from "next/navigation"

async function getCompra(id: string) {
  const numericId = Number.parseInt(id, 10)
  if (isNaN(numericId)) return null

  try {
    const [compra] = await sql`
      SELECT m.*, p.razon_social as proveedor_nombre, p.cuit as proveedor_cuit
      FROM movimientos m
      LEFT JOIN proveedores p ON m.id_proveedor = p.id_proveedor
      WHERE m.id_movimiento = ${numericId} AND m.tipo = 'compra'
    `

    if (!compra) return null

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
      ...compra,
      detalles: detalles || [],
      asiento: asiento || [],
    }
  } catch (error) {
    console.error("[v0] Error getting compra:", error)
    return null
  }
}

export default async function CompraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const numericId = Number.parseInt(id, 10)
  if (isNaN(numericId)) {
    notFound()
  }

  const compra = await getCompra(id)

  if (!compra) {
    notFound()
  }

  return (
    <div className="flex flex-col">
      <Header title="Detalle de Compra" />
      <div className="p-6">
        <CompraDetail compra={compra} />
      </div>
    </div>
  )
}
