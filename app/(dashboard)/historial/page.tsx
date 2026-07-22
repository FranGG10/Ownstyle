export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import { HistorialClient } from "@/components/historial/historial-client"

export default function HistorialPage() {
  return (
    <>
      <Header />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Historial de Productos</h1>
          <p className="text-muted-foreground">
            Consulta el historial completo de movimientos de cada zapatilla
          </p>
        </div>
        <HistorialClient />
      </main>
    </>
  )
}
