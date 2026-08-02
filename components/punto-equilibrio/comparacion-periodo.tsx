import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/format"

function VariacionChip({ valor, higherIsBetter = true }: { valor: number | null; higherIsBetter?: boolean }) {
  if (valor === null) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        Sin datos previos
      </Badge>
    )
  }
  const esPositivo = higherIsBetter ? valor >= 0 : valor <= 0
  return (
    <Badge
      className={
        esPositivo
          ? "gap-1 border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "gap-1 border-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }
    >
      {valor >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {valor >= 0 ? "+" : ""}
      {valor.toFixed(1)}%
    </Badge>
  )
}

interface Metrics {
  ventas: number
  costosVariables: { total: number }
  costosFijos: { total: number }
  margenContribucionPct: number
  resultado: number
}

interface ComparacionPeriodoProps {
  actual: Metrics
  anterior: Metrics & { from: string; to: string }
}

function pctChange(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

export function ComparacionPeriodo({ actual, anterior }: ComparacionPeriodoProps) {
  const filas = [
    { label: "Ventas", actualVal: actual.ventas, anteriorVal: anterior.ventas, higherIsBetter: true },
    {
      label: "Costos Variables",
      actualVal: actual.costosVariables.total,
      anteriorVal: anterior.costosVariables.total,
      higherIsBetter: false,
    },
    {
      label: "Costos Fijos",
      actualVal: actual.costosFijos.total,
      anteriorVal: anterior.costosFijos.total,
      higherIsBetter: false,
    },
    {
      label: "Margen de Contribución %",
      actualVal: actual.margenContribucionPct,
      anteriorVal: anterior.margenContribucionPct,
      higherIsBetter: true,
      esPorcentaje: true,
    },
    { label: "Resultado", actualVal: actual.resultado, anteriorVal: anterior.resultado, higherIsBetter: true },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparación con Período Anterior</CardTitle>
        <p className="text-xs text-muted-foreground">
          Período anterior: {anterior.from} al {anterior.to}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Métrica</th>
                <th className="pb-2 font-medium text-right">Actual</th>
                <th className="pb-2 font-medium text-right">Anterior</th>
                <th className="pb-2 font-medium text-right">Variación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.label} className="border-b last:border-0">
                  <td className="py-2 font-medium">{f.label}</td>
                  <td className="py-2 text-right tabular-nums">
                    {f.esPorcentaje ? `${f.actualVal.toFixed(1)}%` : formatCurrency(f.actualVal)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {f.esPorcentaje ? `${f.anteriorVal.toFixed(1)}%` : formatCurrency(f.anteriorVal)}
                  </td>
                  <td className="py-2 text-right">
                    <VariacionChip valor={pctChange(f.actualVal, f.anteriorVal)} higherIsBetter={f.higherIsBetter} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
