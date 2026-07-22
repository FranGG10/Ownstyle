import { Header } from "@/components/header"
import { ComprasClient } from "@/components/compras/compras-client"

export default function ComprasPage() {
  return (
    <div className="flex flex-col">
      <Header title="Compras" />
      <ComprasClient />
    </div>
  )
}
