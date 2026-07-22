"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Package, ArrowRight, CheckCircle2, Plus, Trash2 } from "lucide-react"
import { createCambio } from "@/app/actions/cambios"

interface Producto {
  id_producto: number
  descripcion: string
  codigo_sku: string
  talle: string | null
  color: string | null
  modelo: string | null
  marca?: string | null
  stock_actual: number
  costo: number
}

interface Cliente {
  id_cliente: number
  razon_social: string
}

interface CambioFormProps {
  productos: Producto[]
  clientes: Cliente[]
}

interface ItemCambio {
  id: number
  entregadoMarca: string
  entregadoModelo: string
  entregadoColor: string
  entregadoTalle: string
  recibidoMarca: string
  recibidoModelo: string
  recibidoColor: string
  recibidoTalle: string
}

const TALLES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]

let nextItemId = 1

function ProductSelector({
  productos,
  marca,
  modelo,
  color,
  talle,
  onMarcaChange,
  onModeloChange,
  onColorChange,
  onTalleChange,
  tipo,
  checkStock,
}: {
  productos: Producto[]
  marca: string
  modelo: string
  color: string
  talle: string
  onMarcaChange: (v: string) => void
  onModeloChange: (v: string) => void
  onColorChange: (v: string) => void
  onTalleChange: (v: string) => void
  tipo: "entregado" | "recibido"
  checkStock: boolean
}) {
  const marcas = useMemo(() => {
    return [...new Set(productos.map((p) => p.marca))].filter(Boolean).sort() as string[]
  }, [productos])

  const modelos = useMemo(() => {
    if (!marca) return []
    return [...new Set(productos.filter((p) => p.marca === marca).map((p) => p.modelo))]
      .filter(Boolean)
      .sort() as string[]
  }, [productos, marca])

  const colores = useMemo(() => {
    if (!marca || !modelo) return []
    return [...new Set(productos.filter((p) => p.marca === marca && p.modelo === modelo).map((p) => p.color))]
      .filter(Boolean)
      .sort() as string[]
  }, [productos, marca, modelo])

  const productosFiltrados = useMemo(() => {
    if (!marca || !modelo || !color) return []
    return productos.filter((p) => p.marca === marca && p.modelo === modelo && p.color === color)
  }, [productos, marca, modelo, color])

  const tallesDisponibles = useMemo(() => {
    if (checkStock) {
      return TALLES.filter((t) => productosFiltrados.some((p) => p.talle === t && p.stock_actual > 0))
    }
    return TALLES.filter((t) => productosFiltrados.some((p) => p.talle === t))
  }, [productosFiltrados, checkStock])

  const productoSeleccionado = productosFiltrados.find((p) => p.talle === talle)

  const isEntregado = tipo === "entregado"
  const colorClass = isEntregado ? "red" : "green"

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Marca</Label>
          <Select value={marca} onValueChange={onMarcaChange}>
            <SelectTrigger className="bg-white dark:bg-gray-900 h-9 text-sm">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              {marcas.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Modelo</Label>
          <Select value={modelo} onValueChange={onModeloChange} disabled={!marca}>
            <SelectTrigger className="bg-white dark:bg-gray-900 h-9 text-sm">
              <SelectValue placeholder={marca ? "Modelo" : "-"} />
            </SelectTrigger>
            <SelectContent>
              {modelos.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Color</Label>
        <Select value={color} onValueChange={onColorChange} disabled={!modelo}>
          <SelectTrigger className="bg-white dark:bg-gray-900 h-9 text-sm">
            <SelectValue placeholder={modelo ? "Color" : "-"} />
          </SelectTrigger>
          <SelectContent>
            {colores.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {color && (
        <div className="space-y-1">
          <Label className="text-xs">{checkStock ? "Talle (con stock)" : "Talle"}</Label>
          <div className="flex flex-wrap gap-1.5">
            {TALLES.map((t) => {
              const disponible = tallesDisponibles.includes(t)
              const selected = talle === t
              const prod = productosFiltrados.find((p) => p.talle === t)
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!disponible}
                  onClick={() => disponible && onTalleChange(t)}
                  className={`
                    px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${!disponible
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                      : selected
                        ? `bg-${colorClass}-500 text-white border-${colorClass}-500`
                        : `bg-white hover:border-${colorClass}-400 dark:bg-gray-900`
                    }
                  `}
                  style={selected ? { backgroundColor: isEntregado ? '#ef4444' : '#22c55e', color: 'white', borderColor: isEntregado ? '#ef4444' : '#22c55e' } : {}}
                >
                  <div>{t}</div>
                  {prod && checkStock && <div className="text-xs opacity-75">({prod.stock_actual})</div>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {productoSeleccionado && (
        <div className="text-xs bg-white dark:bg-gray-900 p-2 rounded border truncate">
          <span className="font-medium">{productoSeleccionado.descripcion}</span>
          <span className="text-muted-foreground ml-1">SKU: {productoSeleccionado.codigo_sku}</span>
        </div>
      )}
    </div>
  )
}

export function CambioForm({ productos, clientes }: CambioFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    id_cliente: "",
    nombre_cliente: "",
    telefono: "",
    motivo: "",
    observaciones: "",
  })

  const [items, setItems] = useState<ItemCambio[]>([
    {
      id: nextItemId++,
      entregadoMarca: "", entregadoModelo: "", entregadoColor: "", entregadoTalle: "",
      recibidoMarca: "", recibidoModelo: "", recibidoColor: "", recibidoTalle: "",
    },
  ])

  const agregarItem = () => {
    setItems([
      ...items,
      {
        id: nextItemId++,
        entregadoMarca: "", entregadoModelo: "", entregadoColor: "", entregadoTalle: "",
        recibidoMarca: "", recibidoModelo: "", recibidoColor: "", recibidoTalle: "",
      },
    ])
  }

  const eliminarItem = (id: number) => {
    if (items.length === 1) return
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: number, field: keyof ItemCambio, value: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const updateItemMultiple = (id: number, fields: Partial<ItemCambio>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...fields } : item)))
  }

  const getProducto = (marca: string, modelo: string, color: string, talle: string) => {
    return productos.find((p) => p.marca === marca && p.modelo === modelo && p.color === color && p.talle === talle)
  }

  const itemsCompletos = items.map((item) => ({
    ...item,
    productoEntregado: getProducto(item.entregadoMarca, item.entregadoModelo, item.entregadoColor, item.entregadoTalle),
    productoRecibido: getProducto(item.recibidoMarca, item.recibidoModelo, item.recibidoColor, item.recibidoTalle),
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    for (let i = 0; i < itemsCompletos.length; i++) {
      const item = itemsCompletos[i]
      if (!item.productoEntregado) {
        setError(`Item ${i + 1}: Debes seleccionar el producto que entregas`)
        return
      }
      if (!item.productoRecibido) {
        setError(`Item ${i + 1}: Debes seleccionar el producto que recibis`)
        return
      }
      if (item.productoEntregado.stock_actual < 1) {
        setError(`Item ${i + 1}: No hay stock disponible de ${item.productoEntregado.descripcion}`)
        return
      }
    }

    if (!formData.motivo.trim()) {
      setError("Debes ingresar el motivo del cambio")
      return
    }

    setLoading(true)

    try {
      const detalles = itemsCompletos.map((item) => ({
        id_producto_entregado: item.productoEntregado!.id_producto,
        id_producto_recibido: item.productoRecibido!.id_producto,
      }))

      const result = await createCambio({
        fecha: formData.fecha,
        id_cliente: formData.id_cliente ? Number.parseInt(formData.id_cliente) : undefined,
        nombre_cliente: formData.nombre_cliente || undefined,
        telefono: formData.telefono || undefined,
        motivo: formData.motivo,
        detalles,
        observaciones: formData.observaciones || undefined,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          window.location.href = "/cambios"
        }, 2000)
      } else {
        setError(result.error || "Error al crear el cambio")
      }
    } catch (err: any) {
      setError(err.message || "Error al crear el cambio")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4 shadow-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-700">Cambio Registrado!</h2>
              <p className="text-muted-foreground">
                El cambio de {items.length} {items.length === 1 ? "par" : "pares"} se ha registrado exitosamente.
              </p>
              <div className="pt-4 space-y-2">
                {itemsCompletos.map((item, idx) => (
                  <div key={item.id} className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="font-medium text-foreground mb-1">Par {idx + 1}</p>
                    <p>
                      <span className="font-medium text-red-600">Entregado:</span> {item.productoEntregado?.descripcion}
                    </p>
                    <p>
                      <span className="font-medium text-green-600">Recibido:</span> {item.productoRecibido?.descripcion}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Redirigiendo...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Datos del Cambio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Datos del Cambio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente (opcional)</Label>
                <Select
                  value={formData.id_cliente}
                  onValueChange={(value) => setFormData({ ...formData, id_cliente: value })}
                >
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre_cliente">Nombre (si no es cliente)</Label>
                <Input
                  id="nombre_cliente"
                  value={formData.nombre_cliente}
                  onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                  placeholder="Nombre del cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Telefono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Telefono de contacto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del Cambio *</Label>
              <Textarea
                id="motivo"
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Ej: Cambio de talle, producto defectuoso, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Observaciones adicionales..."
              />
            </div>

            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Al confirmar, los productos entregados se descuentan del stock inmediatamente.
                Los productos recibidos se sumaran al stock cuando marques el cambio como &quot;Completado&quot;.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => router.push("/cambios")}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Procesando..." : `Confirmar Cambio (${items.length} ${items.length === 1 ? "par" : "pares"})`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Productos del Cambio */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Productos del Cambio ({items.length} {items.length === 1 ? "par" : "pares"})
                </div>
                <Button type="button" variant="outline" size="sm" onClick={agregarItem} className="bg-transparent">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar par
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {items.map((item, idx) => (
                <div key={item.id} className="space-y-3">
                  {idx > 0 && <div className="border-t pt-4" />}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Par {idx + 1}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarItem(item.id)}
                        className="text-red-500 hover:text-red-700 h-7 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-start">
                    {/* Entregado */}
                    <div className="p-3 rounded-lg border-2 border-red-200 bg-red-50/50 dark:bg-red-950/20">
                      <Label className="text-red-700 dark:text-red-400 font-semibold text-xs mb-2 block">
                        ENTREGAS (sale)
                      </Label>
                      <ProductSelector
                        productos={productos}
                        marca={item.entregadoMarca}
                        modelo={item.entregadoModelo}
                        color={item.entregadoColor}
                        talle={item.entregadoTalle}
                        onMarcaChange={(v) => updateItemMultiple(item.id, { entregadoMarca: v, entregadoModelo: "", entregadoColor: "", entregadoTalle: "" })}
                        onModeloChange={(v) => updateItemMultiple(item.id, { entregadoModelo: v, entregadoColor: "", entregadoTalle: "" })}
                        onColorChange={(v) => updateItemMultiple(item.id, { entregadoColor: v, entregadoTalle: "" })}
                        onTalleChange={(v) => updateItem(item.id, "entregadoTalle", v)}
                        tipo="entregado"
                        checkStock={true}
                      />
                    </div>

                    <div className="flex items-center pt-16">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Recibido */}
                    <div className="p-3 rounded-lg border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
                      <Label className="text-green-700 dark:text-green-400 font-semibold text-xs mb-2 block">
                        RECIBIS (entra)
                      </Label>
                      <ProductSelector
                        productos={productos}
                        marca={item.recibidoMarca}
                        modelo={item.recibidoModelo}
                        color={item.recibidoColor}
                        talle={item.recibidoTalle}
                        onMarcaChange={(v) => updateItemMultiple(item.id, { recibidoMarca: v, recibidoModelo: "", recibidoColor: "", recibidoTalle: "" })}
                        onModeloChange={(v) => updateItemMultiple(item.id, { recibidoModelo: v, recibidoColor: "", recibidoTalle: "" })}
                        onColorChange={(v) => updateItemMultiple(item.id, { recibidoColor: v, recibidoTalle: "" })}
                        onTalleChange={(v) => updateItem(item.id, "recibidoTalle", v)}
                        tipo="recibido"
                        checkStock={false}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
