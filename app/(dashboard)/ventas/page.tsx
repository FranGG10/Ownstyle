import { Header } from "@/components/header"
import { VentasClient } from "@/components/ventas/ventas-client"

export default function VentasPage() {
  return (
    <div className="flex flex-col">
      <Header title="Ventas" />
      <VentasClient />
    </div>
  )
}
