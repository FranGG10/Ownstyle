import { Header } from "@/components/header"
import { CompraForm } from "@/components/compras/compra-form"
import { sql } from "@/lib/db"

async function getProveedores() {
  try {
    console.log("[v0] Fetching proveedores for compras/crear")
    const proveedores = await sql`
      SELECT * FROM proveedores WHERE activo = true ORDER BY razon_social
    `
    console.log("[v0] Got proveedores:", proveedores?.length)
    return proveedores || []
  } catch (error) {
    console.error("[v0] Error getting proveedores:", error)
    return []
  }
}

async function getProductos() {
  try {
    console.log("[v0] Fetching productos for compras/crear")
    const productos = await sql`
      SELECT * FROM productos WHERE activo = true ORDER BY marca, descripcion
    `
    console.log("[v0] Got productos:", productos?.length)
    return productos || []
  } catch (error) {
    console.error("[v0] Error getting productos:", error)
    return []
  }
}

export default async function CrearCompraPage() {
  console.log("[v0] Rendering CrearCompraPage")
  const [proveedores, productos] = await Promise.all([getProveedores(), getProductos()])
  console.log("[v0] Rendering CompraForm with", productos.length, "productos and", proveedores.length, "proveedores")

  return (
    <div className="flex flex-col">
      <Header title="Nueva Compra" />
      <div className="p-6">
        <CompraForm proveedores={proveedores} productos={productos} />
      </div>
    </div>
  )
}
