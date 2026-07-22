import { Header } from "@/components/header"
import { ProductDetail } from "@/components/productos/product-detail"
import { sql } from "@/lib/db"
import { notFound } from "next/navigation"

async function getProduct(id: string) {
  const numericId = Number.parseInt(id, 10)
  if (isNaN(numericId)) return null

  try {
    const [product] = await sql`
      SELECT * FROM productos WHERE id_producto = ${numericId}
    `
    return product
  } catch (error) {
    console.error("[v0] Error getting product:", error)
    return null
  }
}

async function getStockMovements(productId: string) {
  const numericId = Number.parseInt(productId, 10)
  if (isNaN(numericId)) return []

  try {
    const movements = await sql`
      SELECT sm.*, m.tipo as movimiento_tipo, m.numero_comprobante
      FROM stock_movimientos sm
      LEFT JOIN movimientos m ON sm.id_movimiento = m.id_movimiento
      WHERE sm.id_producto = ${numericId}
      ORDER BY sm.fecha DESC
      LIMIT 20
    `
    return movements || []
  } catch (error) {
    console.error("[v0] Error getting stock movements:", error)
    return []
  }
}

async function getTiposVenta() {
  try {
    const tipos = await sql`
      SELECT * FROM tipos_venta WHERE activo = true ORDER BY nombre
    `
    return tipos || []
  } catch (error) {
    console.error("[v0] Error getting tipos venta:", error)
    return []
  }
}

export default async function ProductoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const numericId = Number.parseInt(id, 10)
  if (isNaN(numericId)) {
    notFound()
  }

  const [product, stockMovements, tiposVenta] = await Promise.all([
    getProduct(id),
    getStockMovements(id),
    getTiposVenta(),
  ])

  if (!product) {
    notFound()
  }

  return (
    <div className="flex flex-col">
      <Header title="Detalle del Producto" />
      <div className="p-6">
        <ProductDetail product={product} stockMovements={stockMovements} tiposVenta={tiposVenta} />
      </div>
    </div>
  )
}
