import { Header } from "@/components/header"
import { CambioForm } from "@/components/cambios/cambio-form"
import { sql } from "@/lib/db"

async function getData() {
  try {
    const [productos, clientes] = await Promise.all([
      sql`SELECT id_producto, descripcion, codigo_sku, talle, color, modelo, marca, stock_actual, costo 
          FROM productos WHERE activo = true ORDER BY descripcion`,
      sql`SELECT id_cliente, razon_social FROM clientes WHERE activo = true ORDER BY razon_social`,
    ])

    return { productos, clientes }
  } catch (error) {
    console.error("Error fetching data:", error)
    return { productos: [], clientes: [] }
  }
}

export default async function NuevoCambioPage() {
  const { productos, clientes } = await getData()

  return (
    <div className="flex flex-col">
      <Header title="Nuevo Cambio" showBackButton backUrl="/cambios" />
      <div className="p-6">
        <CambioForm productos={productos} clientes={clientes} />
      </div>
    </div>
  )
}
