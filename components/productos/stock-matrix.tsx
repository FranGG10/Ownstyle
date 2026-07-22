"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Producto } from "@/lib/db"

interface StockMatrixProps {
  products: Producto[]
  tipo?: "calzado" | "ropa"
  title?: string
}

const TALLES_CALZADO = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]
const TALLES_ROPA = ["M", "L", "XL", "XXL"]

export function StockMatrix({ products, tipo = "calzado", title }: StockMatrixProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMarca, setFilterMarca] = useState<string>("__all__")

  const talles = tipo === "ropa" ? TALLES_ROPA : TALLES_CALZADO
  const esRopa = tipo === "ropa"

  // Solo los productos que corresponden a este tipo (Ropa vs. calzado)
  const productosDelTipo = useMemo(
    () => products.filter((p) => (esRopa ? p.categoria === "Ropa" : p.categoria !== "Ropa")),
    [products, esRopa],
  )

  // Get unique brands
  const marcas = useMemo(() => {
    const uniqueMarcas = [...new Set(productosDelTipo.map((p) => p.marca))].filter(Boolean).sort()
    return uniqueMarcas
  }, [productosDelTipo])

  // Group products by marca + modelo + color
  const matrixData = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {}
    const productInfo: Record<string, { marca: string; modelo: string; color: string }> = {}

    productosDelTipo.forEach((p) => {
      const key = `${p.marca}|${p.modelo}|${p.color || ""}`
      if (!grouped[key]) {
        grouped[key] = {}
        productInfo[key] = { marca: p.marca || "", modelo: p.modelo || "", color: p.color || "" }
      }
      if (p.talle) {
        grouped[key][p.talle] = (grouped[key][p.talle] || 0) + (p.stock_actual || 0)
      }
    })

    return Object.entries(grouped)
      .map(([key, stockByTalle]) => ({
        key,
        ...productInfo[key],
        stockByTalle,
        total: Object.values(stockByTalle).reduce((sum, qty) => sum + qty, 0),
      }))
      .sort((a, b) => {
        if (a.marca !== b.marca) return a.marca.localeCompare(b.marca)
        if (a.modelo !== b.modelo) return a.modelo.localeCompare(b.modelo)
        return a.color.localeCompare(b.color)
      })
  }, [productosDelTipo])

  // Filter data
  const filteredData = useMemo(() => {
    return matrixData.filter((row) => {
      const matchesSearch =
        searchTerm === "" ||
        row.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.color.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesMarca = filterMarca === "__all__" || row.marca === filterMarca

      return matchesSearch && matchesMarca
    })
  }, [matrixData, searchTerm, filterMarca])

  // Calculate column totals
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    talles.forEach((talle) => {
      totals[talle] = filteredData.reduce((sum, row) => sum + (row.stockByTalle[talle] || 0), 0)
    })
    totals.total = filteredData.reduce((sum, row) => sum + row.total, 0)
    return totals
  }, [filteredData])

  // Helper to get cell color based on stock value
  const getCellStyle = (value: number) => {
    if (value < 0) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    if (value === 0) return "text-muted-foreground"
    if (value > 0) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    return ""
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title ?? "Matriz de Stock por Talle"}</CardTitle>
        <div className="flex gap-4 mt-3">
          <Input
            placeholder="Buscar marca, modelo o color..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterMarca} onValueChange={setFilterMarca}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las marcas</SelectItem>
              {marcas.map((marca) => (
                <SelectItem key={marca} value={marca || ""}>
                  {marca}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-semibold sticky left-0 bg-muted/50 min-w-[100px]">Marca</th>
                <th className="text-left p-3 font-semibold min-w-[120px]">Modelo</th>
                <th className="text-left p-3 font-semibold min-w-[80px]">Color</th>
                {talles.map((talle) => (
                  <th key={talle} className="text-center p-3 font-semibold min-w-[50px]">
                    {talle}
                  </th>
                ))}
                <th className="text-center p-3 font-bold bg-primary/10 min-w-[60px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={talles.length + 4} className="text-center p-8 text-muted-foreground">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                <>
                  {filteredData.map((row, idx) => (
                    <tr
                      key={row.key}
                      className={`border-b hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                    >
                      <td className="p-3 font-medium sticky left-0 bg-background">{row.marca}</td>
                      <td className="p-3">{row.modelo}</td>
                      <td className="p-3">{row.color || "-"}</td>
                      {talles.map((talle) => {
                        const existe = talle in row.stockByTalle
                        const value = row.stockByTalle[talle] || 0
                        return (
                          <td
                            key={talle}
                            className={`text-center p-3 font-mono ${
                              esRopa
                                ? existe
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "text-muted-foreground"
                                : getCellStyle(value)
                            }`}
                          >
                            {esRopa ? (existe ? "∞" : "-") : value}
                          </td>
                        )
                      })}
                      <td className={`text-center p-3 font-bold bg-primary/5 ${esRopa ? "" : getCellStyle(row.total)}`}>
                        {esRopa ? "∞" : row.total}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-muted font-bold border-t-2">
                    <td className="p-3 sticky left-0 bg-muted" colSpan={3}>
                      TOTAL
                    </td>
                    {talles.map((talle) => (
                      <td
                        key={talle}
                        className={`text-center p-3 font-mono ${esRopa ? "" : getCellStyle(columnTotals[talle])}`}
                      >
                        {esRopa ? "∞" : columnTotals[talle]}
                      </td>
                    ))}
                    <td className={`text-center p-3 bg-primary/20 ${esRopa ? "" : getCellStyle(columnTotals.total)}`}>
                      {esRopa ? "∞" : columnTotals.total}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
