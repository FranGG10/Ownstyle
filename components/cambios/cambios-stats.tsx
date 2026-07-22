import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, Clock, CheckCircle, Calendar } from "lucide-react"

interface CambiosStatsProps {
  stats: {
    total: number
    pendientes: number
    completados: number
    mesActual: number
  }
}

export function CambiosStats({ stats }: CambiosStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50 to-background dark:from-violet-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-violet-500/20 p-3">
              <RefreshCw className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cambios</p>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Cambios registrados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-background dark:from-amber-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-500/20 p-3">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendientes}</p>
              <p className="text-xs text-muted-foreground">Esperando devolución</p>
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
              <p className="text-sm text-muted-foreground">Completados</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completados}</p>
              <p className="text-xs text-muted-foreground">Cambios finalizados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-50 to-background dark:from-sky-950/20 dark:to-background shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-sky-500/20 p-3">
              <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Este Mes</p>
              <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.mesActual}</p>
              <p className="text-xs text-muted-foreground">Cambios del mes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
