import { Card, CardContent } from "@/components/ui/card"
import { Package, PackageCheck, Boxes, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface ProductsStatsProps {
  stats: {
    total: number
    activos: number
    stockTotal: number
    valorTotal: number
  }
}

export function ProductsStats({ stats }: ProductsStatsProps) {
  const cards = [
    {
      title: "Total Productos",
      value: stats.total.toString(),
      icon: Package,
      border: "border-l-4 border-l-blue-500",
      iconBg: "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Activos",
      value: stats.activos.toString(),
      icon: PackageCheck,
      border: "border-l-4 border-l-emerald-500",
      iconBg: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10",
      iconColor: "text-emerald-600",
    },
    {
      title: "Stock Total",
      value: stats.stockTotal.toString(),
      icon: Boxes,
      border: "border-l-4 border-l-purple-500",
      iconBg: "bg-gradient-to-br from-purple-500/20 to-purple-600/10",
      iconColor: "text-purple-600",
    },
    {
      title: "Valor Inventario",
      value: formatCurrency(stats.valorTotal),
      icon: DollarSign,
      border: "border-l-4 border-l-amber-500",
      iconBg: "bg-gradient-to-br from-amber-500/20 to-amber-600/10",
      iconColor: "text-amber-600",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={`overflow-hidden transition-all duration-200 hover:shadow-lg ${card.border}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`rounded-xl p-3 ${card.iconBg}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
