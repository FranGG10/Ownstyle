"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Star, DollarSign, ShoppingCart, Receipt, TrendingUp, Percent, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"

export interface Indicator {
  code: string
  label: string
  value: number | null
  unit: "currency" | "percent" | "number" | "ratio"
}

const ICONOS: Record<string, any> = {
  total_facturado: DollarSign,
  cantidad_ventas: ShoppingCart,
  ticket_promedio: Receipt,
  margen_bruto_pct: Percent,
  margen_contribucion_pct: Percent,
  margen_neto_pct: TrendingUp,
  resultado_neto: Wallet,
}

function formatValor(value: number | null, unit: Indicator["unit"]): string {
  if (value === null) return "—"
  if (unit === "currency") return formatCurrency(value)
  if (unit === "percent") return `${value.toFixed(1)}%`
  if (unit === "ratio") return `${value.toFixed(2)}x`
  return value.toLocaleString("es-AR")
}

interface IndicatorCardProps {
  indicator: Indicator
  esFavorito?: boolean
  onToggleFavorito?: (code: string, favorito: boolean) => void
}

export function IndicatorCard({ indicator, esFavorito, onToggleFavorito }: IndicatorCardProps) {
  const Icono = ICONOS[indicator.code] || TrendingUp
  const esNegativo = indicator.value !== null && indicator.value < 0

  return (
    <Card className="relative">
      {onToggleFavorito && (
        <button
          type="button"
          onClick={() => onToggleFavorito(indicator.code, !esFavorito)}
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
          title={esFavorito ? "Quitar de favoritos" : "Marcar como favorito"}
        >
          <Star className={cn("h-4 w-4", esFavorito && "fill-amber-400 text-amber-400")} />
        </button>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icono className="h-3.5 w-3.5" />
          {indicator.label}
        </div>
        <p className={cn("text-2xl font-bold", esNegativo && "text-red-600")}>
          {formatValor(indicator.value, indicator.unit)}
        </p>
      </CardContent>
    </Card>
  )
}
