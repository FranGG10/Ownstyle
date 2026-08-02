import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface DetalleCuenta {
  codigo: string
  nombre: string
  monto: number
}

interface CostosDetalleProps {
  titulo: string
  total: number
  detalle: DetalleCuenta[]
  ventas: number
  colorClass: string
}

export function CostosDetalle({ titulo, total, detalle, ventas, colorClass }: CostosDetalleProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{titulo}</span>
          <span className="text-lg font-bold">{formatCurrency(total)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {detalle.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos en el período.</p>
        ) : (
          detalle
            .slice()
            .sort((a, b) => b.monto - a.monto)
            .map((d) => {
              const pctDelTotal = total > 0 ? (d.monto / total) * 100 : 0
              const pctDeVentas = ventas > 0 ? (d.monto / ventas) * 100 : 0
              return (
                <div key={d.codigo} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.nombre}</span>
                    <span className="text-muted-foreground">{formatCurrency(d.monto)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className={cn("h-2 rounded-full", colorClass)} style={{ width: `${Math.min(pctDelTotal, 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pctDelTotal.toFixed(1)}% del total · {pctDeVentas.toFixed(1)}% de las ventas
                  </p>
                </div>
              )
            })
        )}
      </CardContent>
    </Card>
  )
}
