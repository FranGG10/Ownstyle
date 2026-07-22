export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { RecentMovements } from "@/components/dashboard/recent-movements"
import { LowStockAlert } from "@/components/dashboard/low-stock-alert"
import { neon } from "@neondatabase/serverless"
import { Package, ShoppingCart, ShoppingBag, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/format"

function getSQL() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) {
    throw new Error("Database URL not configured")
  }
  return neon(databaseUrl)
}

async function getDashboardData() {
  try {
    const sql = getSQL()

    // Get total products
    const [productsCount] = await sql`SELECT COUNT(*) as count FROM productos WHERE activo = true`

    // Get total stock value
    const [stockValue] =
      await sql`SELECT COALESCE(SUM(stock_actual * costo), 0) as total FROM productos WHERE activo = true`

    // Get sales this month
    const [salesMonth] = await sql`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
      FROM movimientos 
      WHERE tipo = 'venta' 
      AND estado = 'completado'
      AND fecha >= date_trunc('month', CURRENT_DATE)
    `

    // Get purchases this month
    const [purchasesMonth] = await sql`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
      FROM movimientos 
      WHERE tipo = 'compra' 
      AND estado = 'completado'
      AND fecha >= date_trunc('month', CURRENT_DATE)
    `

    // Get recent movements
    const recentMovements = await sql`
      SELECT id_movimiento as id, tipo, numero_comprobante, fecha, total, estado
      FROM movimientos 
      ORDER BY created_at DESC 
      LIMIT 5
    `

    // Get low stock products
    const lowStockProducts = await sql`
      SELECT id_producto, codigo_sku, descripcion, stock_actual, stock_minimo
      FROM productos 
      WHERE activo = true AND categoria != 'Ropa' AND stock_actual <= stock_minimo
      ORDER BY stock_actual ASC
      LIMIT 5
    `

    return {
      productsCount: Number(productsCount?.count || 0),
      stockValue: Number(stockValue?.total || 0),
      salesMonth: { total: Number(salesMonth?.total || 0), count: Number(salesMonth?.count || 0) },
      purchasesMonth: { total: Number(purchasesMonth?.total || 0), count: Number(purchasesMonth?.count || 0) },
      recentMovements: recentMovements || [],
      lowStockProducts: lowStockProducts || [],
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return {
      productsCount: 0,
      stockValue: 0,
      salesMonth: { total: 0, count: 0 },
      purchasesMonth: { total: 0, count: 0 },
      recentMovements: [],
      lowStockProducts: [],
    }
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Productos Activos"
            value={data.productsCount.toString()}
            description="Total en catálogo"
            icon={Package}
            variant="default"
          />
          <StatsCard
            title="Valor de Inventario"
            value={formatCurrency(data.stockValue)}
            description="A precio de costo"
            icon={DollarSign}
            variant="success"
          />
          <StatsCard
            title="Ventas del Mes"
            value={formatCurrency(data.salesMonth.total)}
            description={`${data.salesMonth.count} operaciones`}
            icon={ShoppingCart}
            variant="default"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Compras del Mes"
            value={formatCurrency(data.purchasesMonth.total)}
            description={`${data.purchasesMonth.count} operaciones`}
            icon={ShoppingBag}
            variant="warning"
          />
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentMovements movements={data.recentMovements} />
          <LowStockAlert products={data.lowStockProducts} />
        </div>
      </div>
    </div>
  )
}
