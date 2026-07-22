"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/format"
import { createCompra } from "@/app/actions/compras"
import type { Producto, Proveedor } from "@/lib/db"

interface CompraFormProps {
  productos: Producto[]
  proveedores: Proveedor[]
}

interface LineaCompra {
  id_producto: number
  producto: Producto
  cantidad: number
  costo_unitario: number
  subtotal: number
}

const TALLES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]

export function CompraForm({ productos, proveedores }: CompraFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [lineas, setLineas] = useState<LineaCompra[]>([])

  // Form fields
  const [proveedorId, setProveedorId] = useState<string>("")
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
  const [medioPago, setMedioPago] = useState<string>("")
  const [observaciones, setObservaciones] = useState("")

  // Product selection
  const [selectedMarca, setSelectedMarca] = useState<string>("")
  const [selectedModelo, setSelectedModelo] = useState<string>("")
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [selectedTalles, setSelectedTalles] = useState<string[]>([])
  const [costoUnitario, setCostoUnitario] = useState<number>(0)
  const [cantidadPorTalle, setCantidadPorTalle] = useState<number>(1)

  // Get unique values for filters
  const marcas = useMemo(() => {
    return [...new Set(productos.map((p) => p.marca))].filter(Boolean).sort()
  }, [productos])

  const modelos = useMemo(() => {
    if (!selectedMarca) return []
    return [...new Set(productos.filter((p) => p.marca === selectedMarca).map((p) => p.modelo))].filter(Boolean).sort()
  }, [productos, selectedMarca])

  const colores = useMemo(() => {
    if (!selectedMarca || !selectedModelo) return []
    return [
      ...new Set(productos.filter((p) => p.marca === selectedMarca && p.modelo === selectedModelo).map((p) => p.color)),
    ]
      .filter(Boolean)
      .sort()
  }, [productos, selectedMarca, selectedModelo])

  // Get available talles and default costo for selected marca/modelo/color
  const productosFiltrados = useMemo(() => {
    if (!selectedMarca || !selectedModelo || !selectedColor) return []
    return productos.filter(
      (p) => p.marca === selectedMarca && p.modelo === selectedModelo && p.color === selectedColor,
    )
  }, [productos, selectedMarca, selectedModelo, selectedColor])

  const tallesDisponibles = useMemo(() => {
    return TALLES.filter((t) => productosFiltrados.some((p) => p.talle === t))
  }, [productosFiltrados])

  // When color is selected, set default costo
  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    setSelectedTalles([])

    const productoEjemplo = productos.find(
      (p) => p.marca === selectedMarca && p.modelo === selectedModelo && p.color === color,
    )
    if (productoEjemplo) {
      setCostoUnitario(Number(productoEjemplo.costo) || 0)
    }
  }

  // Reset dependent fields when parent changes
  const handleMarcaSelect = (marca: string) => {
    setSelectedMarca(marca)
    setSelectedModelo("")
    setSelectedColor("")
    setSelectedTalles([])
    setCostoUnitario(0)
  }

  const handleModeloSelect = (modelo: string) => {
    setSelectedModelo(modelo)
    setSelectedColor("")
    setSelectedTalles([])
    setCostoUnitario(0)
  }

  const toggleTalle = (talle: string) => {
    setSelectedTalles((prev) => (prev.includes(talle) ? prev.filter((t) => t !== talle) : [...prev, talle]))
  }

  const selectAllTalles = () => {
    if (selectedTalles.length === tallesDisponibles.length) {
      setSelectedTalles([])
    } else {
      setSelectedTalles([...tallesDisponibles])
    }
  }

  const total = lineas.reduce((sum, l) => sum + l.subtotal, 0)

  function addLineas() {
    if (!selectedMarca || !selectedModelo || !selectedColor || selectedTalles.length === 0) {
      setError("Seleccione marca, modelo, color y al menos un talle")
      return
    }

    if (costoUnitario <= 0) {
      setError("Ingrese un costo unitario válido")
      return
    }

    const newLineas = [...lineas]

    for (const talle of selectedTalles) {
      const producto = productosFiltrados.find((p) => p.talle === talle)
      if (!producto) continue

      const existingIndex = newLineas.findIndex((l) => l.id_producto === producto.id_producto)

      if (existingIndex >= 0) {
        // Update existing line
        const newCantidad = newLineas[existingIndex].cantidad + cantidadPorTalle
        newLineas[existingIndex].cantidad = newCantidad
        newLineas[existingIndex].costo_unitario = costoUnitario
        newLineas[existingIndex].subtotal = newCantidad * costoUnitario
      } else {
        // Add new line
        newLineas.push({
          id_producto: producto.id_producto,
          producto,
          cantidad: cantidadPorTalle,
          costo_unitario: costoUnitario,
          subtotal: cantidadPorTalle * costoUnitario,
        })
      }
    }

    setLineas(newLineas)

    // Reset selection
    setSelectedTalles([])
    setError("")
  }

  function removeLinea(index: number) {
    setLineas(lineas.filter((_, i) => i !== index))
  }

  function updateCantidad(index: number, newCantidad: number) {
    if (newCantidad < 1) return

    const newLineas = [...lineas]
    newLineas[index].cantidad = newCantidad
    newLineas[index].subtotal = newCantidad * newLineas[index].costo_unitario
    setLineas(newLineas)
  }

  async function handleSubmit() {
    if (lineas.length === 0) {
      setError("Debe agregar al menos un producto")
      return
    }

    if (!proveedorId) {
      setError("Debe seleccionar un proveedor")
      return
    }

    if (!medioPago) {
      setError("Debe seleccionar un medio de pago")
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await createCompra({
        id_proveedor: Number.parseInt(proveedorId),
        fecha,
        medio_pago: medioPago,
        total,
        observaciones,
        lineas: lineas.map((l) => ({
          id_producto: l.id_producto,
          cantidad: l.cantidad,
          costo_unitario: l.costo_unitario,
          subtotal: l.subtotal,
        })),
      })

      if (result.success) {
        alert(`✓ Compra registrada exitosamente\n\nTotal: ${formatCurrency(total)}\nStock actualizado correctamente.`)
        window.location.href = "/compras"
      } else {
        setError(result.error || "Error al crear la compra")
        alert(`Error: ${result.error || "No se pudo registrar la compra"}`)
        setLoading(false)
      }
    } catch (err) {
      setError("Error al crear la compra")
      alert("Error: Ocurrió un error inesperado al crear la compra")
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {/* Datos de la Compra */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Proveedor *</Label>
                <Select value={proveedorId} onValueChange={setProveedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((proveedor) => (
                      <SelectItem key={proveedor.id_proveedor} value={proveedor.id_proveedor.toString()}>
                        {proveedor.razon_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Medio de Pago *</Label>
                <Select value={medioPago} onValueChange={setMedioPago}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar medio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Detalle / Observaciones</Label>
              <Textarea
                placeholder="N° de factura del proveedor, observaciones..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Agregar Productos */}
        <Card>
          <CardHeader>
            <CardTitle>Agregar Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Marca, Modelo, Color */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select value={selectedMarca} onValueChange={handleMarcaSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {marcas.map((marca) => (
                      <SelectItem key={marca} value={marca}>
                        {marca}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={selectedModelo} onValueChange={handleModeloSelect} disabled={!selectedMarca}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedMarca ? "Seleccionar modelo" : "Primero seleccione marca"} />
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
                <Label>Color</Label>
                <Select value={selectedColor} onValueChange={handleColorSelect} disabled={!selectedModelo}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedModelo ? "Seleccionar color" : "Primero seleccione modelo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {colores.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Costo y Cantidad */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Costo Unitario *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={costoUnitario || ""}
                  onChange={(e) => setCostoUnitario(Number.parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad por Talle</Label>
                <Input
                  type="number"
                  min={1}
                  value={cantidadPorTalle}
                  onChange={(e) => setCantidadPorTalle(Number.parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Row 3: Talles */}
            {selectedColor && tallesDisponibles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Seleccionar Talles</Label>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllTalles}>
                    {selectedTalles.length === tallesDisponibles.length ? "Deseleccionar todos" : "Seleccionar todos"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tallesDisponibles.map((talle) => (
                    <button
                      key={talle}
                      type="button"
                      onClick={() => toggleTalle(talle)}
                      className={`
                        px-4 py-2 rounded-md border text-sm font-medium transition-colors
                        ${
                          selectedTalles.includes(talle)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-input"
                        }
                      `}
                    >
                      {talle}
                    </button>
                  ))}
                </div>
                {selectedTalles.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTalles.length} talle(s) seleccionado(s) × {cantidadPorTalle} unidad(es) ={" "}
                    {selectedTalles.length * cantidadPorTalle} productos
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={addLineas}
              disabled={!selectedColor || selectedTalles.length === 0 || costoUnitario <= 0}
              className="w-full md:w-auto"
            >
              + Agregar Productos
            </Button>
          </CardContent>
        </Card>

        {/* Detalle de la Compra */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de la Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Talle</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No hay productos agregados
                      </TableCell>
                    </TableRow>
                  ) : (
                    lineas.map((linea, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {linea.producto.marca} {linea.producto.modelo}
                            </p>
                            <p className="text-sm text-muted-foreground">{linea.producto.color}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{linea.producto.talle}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-transparent"
                              onClick={() => updateCantidad(index, linea.cantidad - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center tabular-nums">{linea.cantidad}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-transparent"
                              onClick={() => updateCantidad(index, linea.cantidad + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(linea.costo_unitario)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatCurrency(linea.subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeLinea(index)}>
                            <span className="text-destructive">✕</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Productos</span>
                <span className="tabular-nums">{lineas.length} líneas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unidades</span>
                <span className="tabular-nums">{lineas.reduce((sum, l) => sum + l.cantidad, 0)}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={handleSubmit}
                disabled={loading || lineas.length === 0 || !proveedorId || !medioPago}
                className="w-full"
                size="lg"
              >
                {loading ? "Procesando..." : "Confirmar Compra"}
              </Button>
              <Button variant="outline" onClick={() => router.back()} className="w-full">
                Cancelar
              </Button>
            </div>

            <div className="pt-4 text-xs text-muted-foreground">
              <p>Al confirmar se generará automáticamente:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Movimiento de stock (entrada)</li>
                <li>Asiento contable de compra</li>
                <li>Actualización del costo del producto</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
