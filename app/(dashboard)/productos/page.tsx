export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import { ProductsTable } from "@/components/productos/products-table"
import { ProductsStats } from "@/components/productos/products-stats"
import { StockMatrix } from "@/components/productos/stock-matrix"
import { sql } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import Link from "next/link"

async function getProductsData() {
  try {
    const products = await sql`
      SELECT * FROM productos 
      ORDER BY descripcion ASC
    `

    const [stats] = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE activo = true) as activos,
        COALESCE(SUM(stock_actual), 0) as stock_total,
        COALESCE(SUM(stock_actual * costo), 0) as valor_total
      FROM productos
    `

    return {
      products: products || [],
      stats: {
        total: Number(stats?.total || 0),
        activos: Number(stats?.activos || 0),
        stockTotal: Number(stats?.stock_total || 0),
        valorTotal: Number(stats?.valor_total || 0),
      },
    }
  } catch (error) {
    console.error("Error fetching products:", error)
    return {
      products: [],
      stats: { total: 0, activos: 0, stockTotal: 0, valorTotal: 0 },
    }
  }
}

export default async function ProductosPage() {
  const { products, stats } = await getProductsData()

  return (
    <div className="flex flex-col">
      <Header title="Productos" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gestión de Productos</h2>
            <p className="text-sm text-muted-foreground">Administra el catálogo de zapatillas</p>
          </div>
          <Link href="/productos/crear">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </Link>
        </div>

        <ProductsStats stats={stats} />

        <Tabs defaultValue="tabla" className="w-full">
          <TabsList>
            <TabsTrigger value="tabla">Vista Tabla</TabsTrigger>
            <TabsTrigger value="matriz-zapas">Matriz Zapatillas</TabsTrigger>
            <TabsTrigger value="matriz-ropa">Matriz Ropa</TabsTrigger>
          </TabsList>
          <TabsContent value="tabla" className="mt-4">
            <ProductsTable products={products} />
          </TabsContent>
          <TabsContent value="matriz-zapas" className="mt-4">
            <StockMatrix products={products} tipo="calzado" title="Matriz de Stock - Zapatillas" />
          </TabsContent>
          <TabsContent value="matriz-ropa" className="mt-4">
            <StockMatrix products={products} tipo="ropa" title="Matriz de Stock - Ropa" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
