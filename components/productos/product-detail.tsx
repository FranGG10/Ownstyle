"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { Edit, ArrowLeft, TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import Link from "next/link"
import type { Producto, StockMovimiento, TipoVenta } from "@/lib/db"

interface ProductDetailProps {
  product: Producto
  stockMovements: (StockMovimiento & { movimiento_tipo?: string; numero_comprobante?: string })[]
  tiposVenta: TipoVenta[]
}

export function ProductDetail({ product, stockMovements, tiposVenta }: ProductDetailProps) {
  const getStockBadge = (stockActual: number, stockMinimo: number, categoria?: string | null) => {
    if (categoria === "Ropa") {
      return <Badge className="bg-blue-500/10 text-blue-600 border border-blue-200">Ilimitado</Badge>
    }
    if (stockActual === 0) {
      return <Badge variant="destructive">Sin Stock</Badge>
    }
    if (stockActual <= stockMinimo) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Stock Bajo</Badge>
    }
    return <Badge className="bg-success/10 text-success border-success/20">En Stock</Badge>
  }

  const getMovementIcon = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return <TrendingUp className="h-4 w-4 text-success" />
      case "salida":
        return <TrendingDown className="h-4 w-4 text-destructive" />
      default:
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Link href="/productos">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <Link href={`/productos/detalle/${product.id_producto}/editar`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      {/* Product Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información del Producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Código SKU</p>
                <p className="font-mono font-medium">{product.codigo_sku}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <div className="mt-1">
                  {getStockBadge(product.stock_actual, product.stock_minimo, product.categoria)}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Descripción</p>
              <p className="font-medium">{product.descripcion}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Marca</p>
                <p className="font-medium">{product.marca || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-medium">{product.categoria || "-"}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Talle</p>
                <p className="font-medium">{product.talle || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Color</p>
                <p className="font-medium">{product.color || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costo y Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Costo de Compra</p>
                <p className="text-2xl font-bold">{formatCurrency(Number(product.costo))}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Stock Actual</p>
                <p className="text-2xl font-bold">{product.categoria === "Ropa" ? "∞ Ilimitado" : product.stock_actual}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Stock Mínimo</p>
              <p className="text-xl font-bold">{product.stock_minimo}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Precios de Venta según Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {tiposVenta.map((tipo) => {
              const margen =
                Number(product.costo) > 0
                  ? (((Number(tipo.precio) - Number(product.costo)) / Number(product.costo)) * 100).toFixed(1)
                  : "0"
              return (
                <div key={tipo.id_tipo_venta} className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-primary">{tipo.nombre}</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(Number(tipo.precio))}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Margen: <span className="text-success font-medium">{margen}%</span>
                  </p>
                  {tipo.cantidad_minima > 1 && (
                    <p className="text-xs text-muted-foreground">Mín: {tipo.cantidad_minima} uds.</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stock Movements History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos de Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Stock Anterior</TableHead>
                  <TableHead className="text-right">Stock Nuevo</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay movimientos de stock
                    </TableCell>
                  </TableRow>
                ) : (
                  stockMovements.map((movement) => (
                    <TableRow key={movement.id_stock_mov}>
                      <TableCell className="text-sm">{formatDateTime(movement.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.tipo)}
                          <span className="capitalize">{movement.tipo}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {movement.movimiento_tipo && (
                          <Badge variant="outline" className="capitalize">
                            {movement.movimiento_tipo}
                          </Badge>
                        )}
                        {movement.numero_comprobante && (
                          <span className="ml-2 text-sm text-muted-foreground">{movement.numero_comprobante}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {movement.tipo === "entrada" ? "+" : "-"}
                        {movement.cantidad}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{movement.stock_anterior}</TableCell>
                      <TableCell className="text-right tabular-nums">{movement.stock_nuevo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{movement.motivo || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
