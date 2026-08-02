"use client"

import { formatCurrency } from "@/lib/format"

interface CvpChartProps {
  ventas: number
  costosFijos: number
  costosVariables: number
  ventasEquilibrio: number
  estado: "rentable" | "empate" | "pierde" | "sin_datos"
}

const COLOR_ESTADO: Record<CvpChartProps["estado"], string> = {
  rentable: "#10b981",
  empate: "#f59e0b",
  pierde: "#ef4444",
  sin_datos: "#94a3b8",
}

const W = 640
const H = 320
const PAD_L = 70
const PAD_B = 36
const PAD_T = 16
const PAD_R = 16

export function CvpChart({ ventas, costosFijos, costosVariables, ventasEquilibrio, estado }: CvpChartProps) {
  if (ventas <= 0 && ventasEquilibrio <= 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No hay datos suficientes para graficar el punto de equilibrio.
      </div>
    )
  }

  const varCostRatio = ventas > 0 ? costosVariables / ventas : 0
  const maxX = Math.max(ventas, ventasEquilibrio, 1) * 1.25
  const costosEnMaxX = costosFijos + varCostRatio * maxX
  const maxY = Math.max(maxX, costosEnMaxX, costosFijos, 1) * 1.05

  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B

  const sx = (x: number) => PAD_L + (x / maxX) * plotW
  const sy = (y: number) => PAD_T + plotH - (y / maxY) * plotH

  const puntoEquilibrio = { x: ventasEquilibrio, y: ventasEquilibrio }
  const puntoActual = { x: ventas, y: ventas }
  const colorActual = COLOR_ESTADO[estado]

  const lineasGuiaY = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]" role="img" aria-label="Gráfico de Punto de Equilibrio">
        {/* líneas guía horizontales */}
        {lineasGuiaY.map((g) => (
          <line
            key={g}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={PAD_T + plotH * (1 - g)}
            y2={PAD_T + plotH * (1 - g)}
            stroke="currentColor"
            className="text-border"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        ))}

        {/* eje Y */}
        {lineasGuiaY.map((g) => (
          <text
            key={`label-${g}`}
            x={PAD_L - 8}
            y={PAD_T + plotH * (1 - g) + 4}
            textAnchor="end"
            className="fill-muted-foreground text-[10px]"
          >
            {formatCurrency(maxY * g).replace(",00", "")}
          </text>
        ))}

        {/* Costos Fijos (línea punteada horizontal) */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={sy(costosFijos)}
          y2={sy(costosFijos)}
          stroke="#f97316"
          strokeDasharray="6 4"
          strokeWidth={1.5}
        />
        <text x={W - PAD_R} y={sy(costosFijos) - 4} textAnchor="end" className="fill-orange-500 text-[10px] font-medium">
          Costos Fijos
        </text>

        {/* Costos Totales */}
        <line
          x1={sx(0)}
          y1={sy(costosFijos)}
          x2={sx(maxX)}
          y2={sy(costosEnMaxX)}
          stroke="#ef4444"
          strokeWidth={2}
        />
        <text x={sx(maxX) - 4} y={sy(costosEnMaxX) - 6} textAnchor="end" className="fill-red-500 text-[10px] font-medium">
          Costos Totales
        </text>

        {/* Ingresos */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(maxX)} y2={sy(maxX)} stroke="#3b82f6" strokeWidth={2} />
        <text x={sx(maxX) - 4} y={sy(maxX) - 6} textAnchor="end" className="fill-blue-500 text-[10px] font-medium">
          Ingresos
        </text>

        {/* Punto de equilibrio */}
        {ventasEquilibrio > 0 && ventasEquilibrio <= maxX && (
          <>
            <line
              x1={sx(puntoEquilibrio.x)}
              y1={sy(puntoEquilibrio.y)}
              x2={sx(puntoEquilibrio.x)}
              y2={PAD_T + plotH}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="3 3"
            />
            <circle cx={sx(puntoEquilibrio.x)} cy={sy(puntoEquilibrio.y)} r={5} fill="#f59e0b" />
            <text
              x={sx(puntoEquilibrio.x)}
              y={PAD_T + plotH + 16}
              textAnchor="middle"
              className="fill-amber-600 text-[10px] font-medium"
            >
              Equilibrio
            </text>
          </>
        )}

        {/* Posición actual */}
        <circle cx={sx(puntoActual.x)} cy={sy(puntoActual.y)} r={6} fill={colorActual} stroke="white" strokeWidth={1.5} />
        <text
          x={sx(puntoActual.x)}
          y={sy(puntoActual.y) - 12}
          textAnchor="middle"
          className="text-[10px] font-semibold"
          fill={colorActual}
        >
          Actual
        </text>

        {/* eje X */}
        <text x={PAD_L} y={H - 6} className="fill-muted-foreground text-[10px]">
          $0
        </text>
        <text x={W - PAD_R} y={H - 6} textAnchor="end" className="fill-muted-foreground text-[10px]">
          Ventas →
        </text>
      </svg>
    </div>
  )
}
