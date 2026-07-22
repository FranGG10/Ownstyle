"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/format"
import { createVenta } from "@/app/actions/ventas"
import type { Producto, Cliente } from "@/lib/db"

interface VentaFormProps {
  productos: Producto[]
  clientes: Cliente[]
}

interface LineaVenta {
  id_producto: number
  producto: Producto
  cantidad: number
}

const TALLES_CALZADO = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]
const TALLES_ROPA = ["M", "L", "XL", "XXL"]

// Un producto de categoria "Ropa" se maneja con stock ilimitado
const esStockIlimitado = (p?: { categoria?: string | null }) => p?.categoria === "Ropa"

export function VentaForm({ productos, clientes }: VentaFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [lineas, setLineas] = useState<LineaVenta[]>([])

  // Form fields - Datos obligatorios
  const [clienteId, setClienteId] = useState<string>("")
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
  const [medioPago, setMedioPago] = useState<string>("")
  const [importeTotal, setImporteTotal] = useState<number>(0)

  // Form fields - Datos opcionales
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [barrio, setBarrio] = useState("")
  const [direccion, setDireccion] = useState("")
  const [observaciones, setObservaciones] = useState("")

  // Product selection (igual que compras)
  const [selectedMarca, setSelectedMarca] = useState<string>("")
  const [selectedModelo, setSelectedModelo] = useState<string>("")
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [selectedTalles, setSelectedTalles] = useState<string[]>([])
  const [cantidadPorTalle, setCantidadPorTalle] = useState<number>(1)

  const defaultCliente = clientes.find((c) => c.razon_social === "Consumidor Final") || clientes[0]

  // Get unique values for filters
  const marcas = useMemo(() => {
    return [...new Set(productos.map((p) => p.marca))].filter(Boolean).sort()
  }, [productos])

  const modelos = useMemo(() => {
    if (!selectedMarca) return []
    const productosConMarca = productos.filter((p) => p.marca === selectedMarca)
    const modelosUnicos = [...new Set(productosConMarca.map((p) => p.modelo))].filter(Boolean).sort()
    console.log("[v0] Marca seleccionada:", selectedMarca)
    console.log("[v0] Productos con esa marca:", productosConMarca.length)
    console.log("[v0] Modelos encontrados:", modelosUnicos)
    return modelosUnicos
  }, [productos, selectedMarca])

  const colores = useMemo(() => {
    if (!selectedMarca || !selectedModelo) return []
    return [
      ...new Set(productos.filter((p) => p.marca === selectedMarca && p.modelo === selectedModelo).map((p) => p.color)),
    ]
      .filter(Boolean)
      .sort()
  }, [productos, selectedMarca, selectedModelo])

  // Get available talles for selected marca/modelo/color
  const productosFiltrados = useMemo(() => {
    if (!selectedMarca || !selectedModelo || !selectedColor) return []
    return productos.filter(
      (p) => p.marca === selectedMarca && p.modelo === selectedModelo && p.color === selectedColor,
    )
  }, [productos, selectedMarca, selectedModelo, selectedColor])

  const tallesDisponibles = useMemo(() => {
    // Ropa: stock ilimitado, mostrar todos los talles que existan sin importar stock
    const ilimitado = productosFiltrados.some((p) => esStockIlimitado(p))
    const listaTalles = ilimitado ? TALLES_ROPA : TALLES_CALZADO
    return listaTalles.filter((t) =>
      productosFiltrados.some((p) => p.talle === t && (esStockIlimitado(p) || p.stock_actual > 0)),
    )
  }, [productosFiltrados])

  // Reset dependent fields when parent changes
  const handleMarcaSelect = (marca: string) => {
    setSelectedMarca(marca)
    setSelectedModelo("")
    setSelectedColor("")
    setSelectedTalles([])
  }

  const handleModeloSelect = (modelo: string) => {
    setSelectedModelo(modelo)
    setSelectedColor("")
    setSelectedTalles([])
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    setSelectedTalles([])
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

  function addLineas() {
    if (!selectedMarca || !selectedModelo || !selectedColor || selectedTalles.length === 0) {
      setError("Debe seleccionar marca, modelo, color y al menos un talle")
      return
    }

    const nuevasLineas: LineaVenta[] = []

    for (const talle of selectedTalles) {
      const producto = productosFiltrados.find((p) => p.talle === talle)
      if (!producto) continue

      // Check if already exists
      const existingIndex = lineas.findIndex((l) => l.id_producto === producto.id_producto)

      if (existingIndex >= 0) {
        // Update existing line
        const newCantidad = lineas[existingIndex].cantidad + cantidadPorTalle
        if (!esStockIlimitado(producto) && newCantidad > producto.stock_actual) {
          setError(`Stock insuficiente para talle ${talle}. Disponible: ${producto.stock_actual}`)
          return
        }
        lineas[existingIndex].cantidad = newCantidad
      } else {
        // Check stock (la ropa tiene stock ilimitado, no se valida)
        if (!esStockIlimitado(producto) && cantidadPorTalle > producto.stock_actual) {
          setError(`Stock insuficiente para talle ${talle}. Disponible: ${producto.stock_actual}`)
          return
        }

        nuevasLineas.push({
          id_producto: producto.id_producto,
          producto,
          cantidad: cantidadPorTalle,
        })
      }
    }

    setLineas([...lineas, ...nuevasLineas])

    // Reset selection
    setSelectedMarca("")
    setSelectedModelo("")
    setSelectedColor("")
    setSelectedTalles([])
    setCantidadPorTalle(1)
    setError("")
  }

  function removeLinea(index: number) {
    setLineas(lineas.filter((_, i) => i !== index))
  }

  function updateCantidad(index: number, newCantidad: number) {
    const linea = lineas[index]
    if (!esStockIlimitado(linea.producto) && newCantidad > linea.producto.stock_actual) {
      setError(`Stock insuficiente para ${linea.producto.descripcion}. Disponible: ${linea.producto.stock_actual}`)
      return
    }
    if (newCantidad < 1) return

    const newLineas = [...lineas]
    newLineas[index].cantidad = newCantidad
    setLineas(newLineas)
    setError("")
  }

  const totalUnidades = lineas.reduce((sum, l) => sum + l.cantidad, 0)
  const totalCosto = lineas.reduce((sum, l) => sum + Number(l.producto.costo) * l.cantidad, 0)

  async function handleSubmit() {
    if (!clienteId && !defaultCliente) {
      setError("Debe seleccionar un cliente")
      return
    }
    if (!fecha) {
      setError("Debe seleccionar una fecha")
      return
    }
    if (!medioPago) {
      setError("Debe seleccionar un medio de pago")
      return
    }
    if (importeTotal <= 0) {
      setError("Debe ingresar el importe total de la venta")
      return
    }
    if (lineas.length === 0) {
      setError("Debe agregar al menos un producto")
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await createVenta({
        id_cliente: Number.parseInt(clienteId || defaultCliente?.id_cliente.toString() || "1"),
        fecha,
        medio_pago: medioPago,
        importe_total: importeTotal,
        nombre,
        telefono,
        barrio,
        direccion,
        observaciones,
        total_costo: totalCosto,
        lineas: lineas.map((l) => ({
          id_producto: l.id_producto,
          cantidad: l.cantidad,
          costo_unitario: Number(l.producto.costo),
        })),
      })

      if (result.success) {
        alert(
          `Venta registrada exitosamente\n\nComprobante: ${result.comprobante}\nTotal: ${formatCurrency(importeTotal)}\nUnidades: ${totalUnidades}`,
        )
        window.location.href = "/ventas"
      } else {
        setError(result.error || "Error al crear la venta")
        alert(`Error: ${result.error || "No se pudo registrar la venta"}`)
        setLoading(false)
      }
    } catch (err) {
      setError("Error al crear la venta")
      alert("Error: Ocurrió un error inesperado al crear la venta")
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Form */}
      <div className="lg:col-span-2 space-y-6">
        {/* Datos de la Venta */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}

            {/* Campos obligatorios */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={clienteId || defaultCliente?.id_cliente.toString() || ""} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id_cliente} value={cliente.id_cliente.toString()}>
                        {cliente.razon_social}
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
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Importe Total *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={importeTotal || ""}
                  onChange={(e) => setImporteTotal(Number.parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="font-semibold"
                />
              </div>
            </div>

            {/* Campos opcionales */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-3">Datos adicionales (opcionales)</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre del comprador"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Teléfono de contacto"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Barrio</Label>
                  <Input value={barrio} onChange={(e) => setBarrio(e.target.value)} placeholder="Barrio" />
                </div>

                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección de entrega"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                placeholder="Observaciones opcionales..."
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

            {/* Cantidad por talle */}
            <div className="grid gap-4 md:grid-cols-2">
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

            {/* Talles */}
            {selectedColor && tallesDisponibles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Seleccionar Talles</Label>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllTalles}>
                    {selectedTalles.length === tallesDisponibles.length ? "Deseleccionar todos" : "Seleccionar todos"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(productosFiltrados.some((p) => esStockIlimitado(p)) ? TALLES_ROPA : TALLES_CALZADO).map((talle) => {
                    const disponible = tallesDisponibles.includes(talle)
                    const selected = selectedTalles.includes(talle)
                    const producto = productosFiltrados.find((p) => p.talle === talle)
                    const ilimitado = esStockIlimitado(producto)

                    return (
                      <button
                        key={talle}
                        type="button"
                        disabled={!disponible}
                        onClick={() => disponible && toggleTalle(talle)}
                        className={`
                          px-4 py-2 rounded-lg border text-sm font-medium transition-all
                          ${
                            !disponible
                              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                              : selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:border-primary"
                          }
                        `}
                      >
                        <div>{talle}</div>
                        {producto && (
                          <div className="text-xs opacity-75">{ilimitado ? "(∞)" : `(${producto.stock_actual})`}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedColor && tallesDisponibles.length === 0 && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                No hay stock disponible para este producto
              </div>
            )}

            <Button
              onClick={addLineas}
              disabled={!selectedMarca || !selectedModelo || !selectedColor || selectedTalles.length === 0}
              className="w-full"
            >
              + Agregar {selectedTalles.length > 0 ? `${selectedTalles.length} producto(s)` : "Productos"}
            </Button>
          </CardContent>
        </Card>

        {/* Detalle de la Venta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Detalle de la Venta
              {totalUnidades > 0 && <Badge variant="secondary">{totalUnidades} unidades</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Stock Disp.</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
                            <p className="text-sm text-muted-foreground">
                              {linea.producto.color} - Talle {linea.producto.talle}
                            </p>
                          </div>
                        </TableCell>
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
                            <span className="w-8 text-center">{linea.cantidad}</span>
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
                        <TableCell className="text-right">{linea.producto.stock_actual}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeLinea(index)}
                          >
                            X
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
      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Productos</span>
              <span>{lineas.length} líneas</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Unidades</span>
              <span>{totalUnidades}</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(importeTotal)}</span>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading || lineas.length === 0}>
              {loading ? "Procesando..." : "Confirmar Venta"}
            </Button>

            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => (window.location.href = "/ventas")}
              disabled={loading}
            >
              Cancelar
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Al confirmar se generará automáticamente:
              <br />• Movimiento de stock (salida)
              <br />• Asiento contable de venta
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
