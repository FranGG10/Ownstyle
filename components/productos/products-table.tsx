"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Search, Eye, Package } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import Link from "next/link"
import type { Producto } from "@/lib/db"

interface ProductsTableProps {
  products: Producto[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [search, setSearch] = useState("")
  const [filterMarca, setFilterMarca] = useState<string>("all")
  const [filterTalle, setFilterTalle] = useState<string>("all")
  const [filterEstado, setFilterEstado] = useState<string>("activos")

  const marcas = [...new Set(products.map((p) => p.marca).filter(Boolean))]
  const talles = [...new Set(products.map((p) => p.talle).filter(Boolean))].sort((a, b) => Number(a) - Number(b))

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      product.codigo_sku.toLowerCase().includes(search.toLowerCase()) ||
      product.color?.toLowerCase().includes(search.toLowerCase())
    const matchesMarca = filterMarca === "all" || product.marca === filterMarca
    const matchesTalle = filterTalle === "all" || product.talle === filterTalle
    const matchesEstado =
      filterEstado === "all" ||
      (filterEstado === "activos" && product.activo) ||
      (filterEstado === "inactivos" && !product.activo)
    return matchesSearch && matchesMarca && matchesTalle && matchesEstado
  })

  const inactivosCount = products.filter((p) => !p.activo).length

  const getStockBadge = (stockActual: number, stockMinimo: number, categoria?: string | null) => {
    if (categoria === "Ropa") {
      return <Badge className="bg-blue-500/10 text-blue-600 border border-blue-200">Ilimitado</Badge>
    }
    if (stockActual === 0) {
      return <Badge className="bg-red-500/10 text-red-600 border border-red-200">Sin Stock</Badge>
    }
    if (stockActual <= stockMinimo) {
      return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200">Stock Bajo</Badge>
    }
    return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-200">En Stock</Badge>
  }

  return (
    <Card className="border-l-4 border-l-blue-500 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <CardTitle className="text-lg">Catálogo de Productos</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción, SKU o color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activos">Solo Activos</SelectItem>
                <SelectItem value="inactivos">Solo Inactivos {inactivosCount > 0 && `(${inactivosCount})`}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMarca} onValueChange={setFilterMarca}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {marcas.map((marca) => (
                  <SelectItem key={marca} value={marca}>
                    {marca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTalle} onValueChange={setFilterTalle}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Talle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los talles</SelectItem>
                {talles.map((talle) => (
                  <SelectItem key={talle} value={talle}>
                    Talle {talle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Marca</TableHead>
                <TableHead className="font-semibold">Modelo</TableHead>
                <TableHead className="font-semibold">Talle</TableHead>
                <TableHead className="font-semibold">Color</TableHead>
                <TableHead className="text-right font-semibold">Costo</TableHead>
                <TableHead className="text-center font-semibold">Stock</TableHead>
                <TableHead className="text-center font-semibold">Estado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product, index) => (
                  <TableRow
                    key={product.id_producto}
                    className={`transition-colors hover:bg-blue-50/50 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"} ${!product.activo ? "opacity-60" : ""}`}
                  >
                    <TableCell className="font-mono text-sm text-blue-600">{product.codigo_sku}</TableCell>
                    <TableCell className="font-medium">{product.marca}</TableCell>
                    <TableCell>{product.modelo}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm font-medium">
                        {product.talle}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-slate-300 border"></span>
                        {product.color}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(Number(product.costo))}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-10 h-7 rounded bg-slate-100 text-sm font-semibold tabular-nums">
                        {product.categoria === "Ropa" ? "∞" : product.stock_actual}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {!product.activo ? (
                        <Badge className="bg-slate-500/10 text-slate-600 border border-slate-300">Inactivo</Badge>
                      ) : (
                        getStockBadge(product.stock_actual, product.stock_minimo, product.categoria)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/productos/detalle/${product.id_producto}`}>
                          <Button variant="ghost" size="icon" className="hover:bg-blue-50 hover:text-blue-600">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/productos/detalle/${product.id_producto}/editar`}>
                          <Button variant="ghost" size="icon" className="hover:bg-amber-50 hover:text-amber-600">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Mostrando {filteredProducts.length} de {products.length} productos
        </div>
      </CardContent>
    </Card>
  )
}
