import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IngresoEgresoForm } from "@/components/ingresos-egresos/ingreso-egreso-form"

export default function NuevoIngresoEgresoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo Ingreso / Egreso</h1>
        <p className="text-muted-foreground">Registrar un nuevo movimiento de ingreso o egreso</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <IngresoEgresoForm />
        </CardContent>
      </Card>
    </div>
  )
}
