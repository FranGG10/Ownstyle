import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package } from "lucide-react"

interface Product {
  id_producto: number
  codigo_sku: string
  descripcion: string
  stock_actual: number
  stock_minimo: number
}

interface LowStockAlertProps {
  products: Product[]
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  return (
    <Card className="border-l-4 border-l-amber-500 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-lg">Stock Bajo</CardTitle>
          </div>
          {products.length > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
              {products.length} alerta{products.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay productos con stock bajo</p>
            </div>
          ) : (
            products.map((product, index) => (
              <div
                key={product.id_producto}
                className={`flex items-center justify-between py-3 px-3 rounded-lg transition-colors hover:bg-slate-50 ${
                  index !== products.length - 1 ? "border-b border-dashed" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{product.descripcion}</p>
                  <p className="text-xs text-muted-foreground font-mono">{product.codigo_sku}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={
                      product.stock_actual === 0
                        ? "bg-red-500/10 text-red-600 border-red-200"
                        : "bg-amber-500/10 text-amber-600 border-amber-200"
                    }
                  >
                    {product.stock_actual} / {product.stock_minimo}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
