import { Card, CardContent } from "@/components/ui/card"
import { ShoppingCart, Package, DollarSign, TrendingUp, CheckCircle } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface VentasStatsProps {
  stats: {
    total: number
    totalPares: number
    totalVentas: number
    ventasMes: number
  }
}

export function VentasStats({ stats }: VentasStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-background dark:from-blue-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-500/20 p-3">
              <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Ventas</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-emerald-500/20 p-3">
              <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Zapatillas Vendidas</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalPares}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-background dark:from-amber-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-500/20 p-3">
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Facturado</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(stats.totalVentas)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-50 to-background dark:from-cyan-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-cyan-500/20 p-3">
              <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ventas del Mes</p>
              <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{formatCurrency(stats.ventasMes)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
