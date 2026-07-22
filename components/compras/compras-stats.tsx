import { Card, CardContent } from "@/components/ui/card"
import { ShoppingBag, CheckCircle, DollarSign, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface ComprasStatsProps {
  stats: {
    total: number
    completadas: number
    totalCompras: number
    comprasMes: number
  }
}

export function ComprasStats({ stats }: ComprasStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50 to-background dark:from-indigo-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-indigo-500/20 p-3">
              <ShoppingBag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Compras</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-emerald-500/20 p-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completadas</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completadas}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-50 to-background dark:from-rose-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-rose-500/20 p-3">
              <DollarSign className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Comprado</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(stats.totalCompras)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-background dark:from-orange-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-orange-500/20 p-3">
              <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Compras del Mes</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(stats.comprasMes)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
