"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/format"
import { Search, Package, ArrowUpCircle, ArrowDownCircle, History } from "lucide-react"

interface Producto {
  id_producto: number
  codigo_sku: string
  descripcion: string
  marca: string
  modelo: string
  color: string
  talle: string
  stock_actual: number
  costo: number
}

interface Movimiento {
  id_stock_mov: number
  tipo: string
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string
  fecha: string
  numero_comprobante: string | null
  tipo_movimiento: string
}

export function HistorialClient() {
  const [marcas, setMarcas] = useState<string[]>([])
  const [modelos, setModelos] = useState<string[]>([])
  const [talles, setTalles] = useState<string[]>([])
  const [selectedMarca, setSelectedMarca] = useState<string>("")
  const [selectedModelo, setSelectedModelo] = useState<string>("")
  const [selectedTalle, setSelectedTalle] = useState<string>("")
  const [producto, setProducto] = useState<Producto | null>(null)
  const [historial, setHistorial] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(false)

  // Cargar marcas iniciales
  useEffect(() => {
    fetchData()
  }, [])

  // Cuando cambia la marca, recargar modelos y resetear modelo/talle
  useEffect(() => {
    if (selectedMarca) {
      setSelectedModelo("")
      setSelectedTalle("")
      setProducto(null)
      setHistorial([])
      fetchData(selectedMarca)
    }
  }, [selectedMarca])

  // Cuando cambia el modelo, recargar talles y resetear talle
  useEffect(() => {
    if (selectedMarca && selectedModelo) {
      setSelectedTalle("")
      setProducto(null)
      setHistorial([])
      fetchData(selectedMarca, selectedModelo)
    }
  }, [selectedModelo])

  // Cuando cambia el talle, cargar historial
  useEffect(() => {
    if (selectedMarca && selectedModelo && selectedTalle) {
      fetchData(selectedMarca, selectedModelo, selectedTalle)
    }
  }, [selectedTalle])

  const fetchData = async (marca?: string, modelo?: string, talle?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (marca) params.append("marca", marca)
      if (modelo) params.append("modelo", modelo)
      if (talle) params.append("talle", talle)
      
      console.log("[v0] Fetching historial with params:", params.toString())
      const res = await fetch(`/api/historial?${params.toString()}`)
      const data = await res.json()
      console.log("[v0] Historial data received:", { marcas: data.marcas?.length, modelos: data.modelos?.length, talles: data.talles?.length })
      
      if (data.marcas) setMarcas(data.marcas)
      if (!marca) {
        // Solo actualizar modelos y talles si no hay filtro de marca
        setModelos([])
        setTalles([])
      } else if (marca && !modelo) {
        // Si hay marca pero no modelo, actualizar modelos
        if (data.modelos) setModelos(data.modelos)
        setTalles([])
      } else if (marca && modelo) {
        // Si hay marca y modelo, actualizar talles
        if (data.talles) setTalles(data.talles)
      }
      
      setProducto(data.producto || null)
      setHistorial(data.historial || [])
    } catch (error) {
      console.error("[v0] Error cargando historial:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTipoBadge = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case "entrada":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Entrada</Badge>
      case "salida":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Salida</Badge>
      default:
        return <Badge variant="secondary">{tipo}</Badge>
    }
  }

  // Calcular resumen
  const totalEntradas = historial.filter(m => m.tipo === "entrada").reduce((sum, m) => sum + m.cantidad, 0)
  const totalSalidas = historial.filter(m => m.tipo === "salida").reduce((sum, m) => sum + m.cantidad, 0)

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Producto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Marca</label>
              <Select value={selectedMarca} onValueChange={setSelectedMarca} disabled={marcas.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={marcas.length === 0 ? "Cargando marcas..." : "Seleccionar marca..."} />
                </SelectTrigger>
                <SelectContent>
                  {marcas.length > 0 ? (
                    marcas.map((marca) => (
                      <SelectItem key={marca} value={marca}>
                        {marca}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">Cargando...</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo</label>
              <Select 
                value={selectedModelo} 
                onValueChange={setSelectedModelo}
                disabled={!selectedMarca}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map((modelo) => (
                    <SelectItem key={modelo} value={modelo}>
                      {modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Talle</label>
              <Select 
                value={selectedTalle} 
                onValueChange={setSelectedTalle}
                disabled={!selectedModelo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar talle..." />
                </SelectTrigger>
                <SelectContent>
                  {talles.map((talle) => (
                    <SelectItem key={talle} value={talle}>
                      {talle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info del Producto */}
      {producto && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Producto Seleccionado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">SKU</p>
                <p className="font-mono font-medium">{producto.codigo_sku}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descripcion</p>
                <p className="font-medium">{producto.descripcion}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Color</p>
                <p className="font-medium">{producto.color}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock Actual</p>
                <p className="font-bold text-lg">{producto.stock_actual} unidades</p>
              </div>
            </div>

            {/* Resumen de movimientos */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <ArrowUpCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Entradas</p>
                  <p className="font-bold text-xl text-green-600">{totalEntradas}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <ArrowDownCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Salidas</p>
                  <p className="font-bold text-xl text-red-600">{totalSalidas}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="font-bold text-xl text-blue-600">{totalEntradas - totalSalidas}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Movimientos */}
      {producto && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Movimientos ({historial.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historial.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No hay movimientos registrados para este producto
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Stock Anterior</TableHead>
                      <TableHead className="text-right">Stock Nuevo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.map((mov) => (
                      <TableRow key={mov.id_stock_mov}>
                        <TableCell>{formatDate(mov.fecha)}</TableCell>
                        <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={mov.motivo}>
                          {mov.motivo}
                        </TableCell>
                        <TableCell>
                          {mov.numero_comprobante ? (
                            <span className="font-mono text-sm">{mov.numero_comprobante}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={mov.tipo === "entrada" ? "text-green-600" : "text-red-600"}>
                            {mov.tipo === "entrada" ? "+" : "-"}{mov.cantidad}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{mov.stock_anterior}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{mov.stock_nuevo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado inicial */}
      {!producto && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Selecciona una marca, modelo y talle para ver el historial de movimientos</p>
              <p className="text-sm mt-2">Podras ver todas las compras, ventas y ajustes de stock del producto</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
