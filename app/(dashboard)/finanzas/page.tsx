import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Construction } from "lucide-react"

export default function FinanzasPage() {
  return (
    <div className="flex flex-col">
      <Header title="Ingresos / Egresos" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Ingresos y Egresos Financieros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Construction className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">En Construcción</h3>
              <p className="text-muted-foreground max-w-md">
                El módulo de ingresos y egresos permite registrar movimientos financieros no relacionados con compra o
                venta de zapatillas (gastos varios, otros ingresos, etc.). Esta funcionalidad estará disponible
                próximamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
