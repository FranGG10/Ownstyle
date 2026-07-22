import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/format"
import { Activity } from "lucide-react"

interface Movement {
  id: number
  tipo: string
  numero_comprobante: string
  fecha: string
  total: number
  estado: string
}

interface RecentMovementsProps {
  movements: Movement[]
}

export function RecentMovements({ movements }: RecentMovementsProps) {
  const getTypeBadge = (tipo: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      venta: { label: "Venta", className: "bg-blue-500/10 text-blue-600 border-blue-200" },
      compra: { label: "Compra", className: "bg-purple-500/10 text-purple-600 border-purple-200" },
      cambio: { label: "Cambio", className: "bg-orange-500/10 text-orange-600 border-orange-200" },
      ajuste: { label: "Ajuste", className: "bg-slate-500/10 text-slate-600 border-slate-200" },
    }
    return variants[tipo] || { label: tipo, className: "bg-slate-100 text-slate-600" }
  }

  const getStatusBadge = (estado: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      completado: { label: "Completado", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
      confirmado: { label: "Completado", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
      pendiente: { label: "Pendiente", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
      anulado: { label: "Anulado", className: "bg-red-500/10 text-red-600 border-red-200" },
    }
    return variants[estado] || { label: estado, className: "" }
  }

  return (
    <Card className="border-l-4 border-l-blue-500 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <CardTitle className="text-lg">Movimientos Recientes</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {movements.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No hay movimientos recientes</p>
          ) : (
            movements.map((movement, index) => {
              const typeBadge = getTypeBadge(movement.tipo)
              const statusBadge = getStatusBadge(movement.estado)
              return (
                <div
                  key={movement.id}
                  className={`flex items-center justify-between py-3 px-3 rounded-lg transition-colors hover:bg-slate-50 ${
                    index !== movements.length - 1 ? "border-b border-dashed" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={typeBadge.className}>
                          {typeBadge.label}
                        </Badge>
                        <span className="text-sm font-medium">{movement.numero_comprobante || `#${movement.id}`}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(movement.fecha)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={statusBadge.className}>
                      {statusBadge.label}
                    </Badge>
                    <span className="font-semibold tabular-nums text-slate-700">{formatCurrency(movement.total)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
