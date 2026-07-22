import { Header } from "@/components/header"
import { VentaForm } from "@/components/ventas/venta-form"
import { sql } from "@/lib/db"

async function getData() {
  try {
    console.log("[v0] Fetching productos and clientes for ventas/nueva")
    const [productos, clientes] = await Promise.all([
      sql`SELECT * FROM productos WHERE activo = true AND (stock_actual > 0 OR categoria = 'Ropa') ORDER BY marca, modelo, talle`,
      sql`SELECT * FROM clientes WHERE activo = true ORDER BY razon_social`,
    ])
    console.log("[v0] Got productos:", productos?.length, "clientes:", clientes?.length)
    return {
      productos: productos || [],
      clientes: clientes || [],
    }
  } catch (error) {
    console.error("[v0] Error in getData for ventas/nueva:", error)
    return { productos: [], clientes: [] }
  }
}

export default async function NuevaVentaPage() {
  console.log("[v0] Rendering NuevaVentaPage")
  const { productos, clientes } = await getData()
  console.log("[v0] Rendering VentaForm with", productos.length, "productos and", clientes.length, "clientes")

  return (
    <div className="flex flex-col">
      <Header title="Nueva Venta" />
      <div className="p-6">
        <VentaForm productos={productos} clientes={clientes} />
      </div>
    </div>
  )
}
