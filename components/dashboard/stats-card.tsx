import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "success" | "warning" | "destructive"
}

export function StatsCard({
  title,
  value,
  description,
  icon: IconComponent,
  trend,
  variant = "default",
}: StatsCardProps) {
  const variantStyles = {
    default: {
      border: "border-l-4 border-l-blue-500",
      iconBg: "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-600",
    },
    success: {
      border: "border-l-4 border-l-emerald-500",
      iconBg: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10",
      iconColor: "text-emerald-600",
    },
    warning: {
      border: "border-l-4 border-l-amber-500",
      iconBg: "bg-gradient-to-br from-amber-500/20 to-amber-600/10",
      iconColor: "text-amber-600",
    },
    destructive: {
      border: "border-l-4 border-l-red-500",
      iconBg: "bg-gradient-to-br from-red-500/20 to-red-600/10",
      iconColor: "text-red-600",
    },
  }

  const styles = variantStyles[variant]

  return (
    <Card className={cn("overflow-hidden transition-all duration-200 hover:shadow-lg", styles.border)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <p className={cn("text-xs font-medium", trend.isPositive ? "text-emerald-600" : "text-red-600")}>
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}% vs mes anterior
              </p>
            )}
          </div>
          <div className={cn("rounded-xl p-3", styles.iconBg)}>
            <IconComponent className={cn("h-6 w-6", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
