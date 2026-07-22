import { Header } from "@/components/header"
import { ProductForm } from "@/components/productos/product-form"
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

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const numericId = Number.parseInt(id, 10)
  if (isNaN(numericId)) {
    notFound()
  }

  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  return (
    <div className="flex flex-col">
      <Header title="Editar Producto" />
      <div className="p-6">
        <ProductForm product={product} />
      </div>
    </div>
  )
}
