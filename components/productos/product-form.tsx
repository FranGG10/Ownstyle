"use client"

import { AlertDialogTrigger } from "@/components/ui/alert-dialog"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { saveProduct, saveMultipleProducts, deleteProduct } from "@/app/actions/productos"
import type { Producto } from "@/lib/db"

interface ProductFormProps {
  product?: Producto
}

const marcasExistentes = ["Adidas", "Airforce", "Campus", "Jordan", "MQ", "Nike", "Puma", "Vans"]
const talles = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [selectedTalles, setSelectedTalles] = useState<string[]>(product?.talle ? [product.talle] : [])
  const [selectAllTalles, setSelectAllTalles] = useState(false)

  const [marcaSeleccionada, setMarcaSeleccionada] = useState(product?.marca || "")
  const [usarMarcaPersonalizada, setUsarMarcaPersonalizada] = useState(false)
  const [marcaPersonalizada, setMarcaPersonalizada] = useState("")

  const marca = usarMarcaPersonalizada ? marcaPersonalizada : marcaSeleccionada

  const [modelo, setModelo] = useState(product?.modelo || "")
  const [color, setColor] = useState(product?.color || "")
  const [costo, setCosto] = useState(product?.costo?.toString() || "")

  const isEditing = !!product

  function handleMarcaChange(value: string) {
    if (value === "__otra__") {
      setUsarMarcaPersonalizada(true)
      setMarcaSeleccionada("")
    } else {
      setUsarMarcaPersonalizada(false)
      setMarcaSeleccionada(value)
      setMarcaPersonalizada("")
    }
  }

  function handleSelectAllTalles(checked: boolean) {
    setSelectAllTalles(checked)
    if (checked) {
      setSelectedTalles([...talles])
    } else {
      setSelectedTalles([])
    }
  }

  function handleTalleToggle(talle: string, checked: boolean) {
    if (checked) {
      setSelectedTalles((prev) => [...prev, talle])
    } else {
      setSelectedTalles((prev) => prev.filter((t) => t !== talle))
      setSelectAllTalles(false)
    }
  }

  function generateSKU(marca: string, modelo: string, color: string, talle: string) {
    const marcaCode = marca.toUpperCase().replace(/\s+/g, "").substring(0, 6)
    const modeloCode = modelo.toUpperCase().replace(/\s+/g, "").substring(0, 8)
    const colorCode = color.toUpperCase().replace(/\s+/g, "").substring(0, 4)
    return `${marcaCode}-${modeloCode}-${colorCode}-${talle}`
  }

  function generateDescription(marca: string, modelo: string, color: string, talle: string) {
    return `${marca} ${modelo} ${color} Talle ${talle}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (!marca || !modelo || !costo) {
        setError("Marca, modelo y costo son obligatorios")
        setLoading(false)
        return
      }

      if (selectedTalles.length === 0) {
        setError("Debe seleccionar al menos un talle")
        setLoading(false)
        return
      }

      const costoNum = Number.parseFloat(costo)
      if (isNaN(costoNum) || costoNum < 0) {
        setError("El costo debe ser un número válido")
        setLoading(false)
        return
      }

      if (isEditing && product) {
        const formData = new FormData()
        formData.append("codigo_sku", product.codigo_sku)
        formData.append("descripcion", generateDescription(marca, modelo, color, selectedTalles[0]))
        formData.append("marca", marca)
        formData.append("modelo", modelo)
        formData.append("categoria", "Zapatillas")
        formData.append("talle", selectedTalles[0])
        formData.append("color", color)
        formData.append("costo", costoNum.toString())
        formData.append("stock_actual", (product.stock_actual || 0).toString())
        formData.append("stock_minimo", "0")

        const result = await saveProduct(formData, product.id_producto)
        if (result.success) {
          alert(`✓ Producto actualizado exitosamente\n\n${marca} ${modelo} ${color} se actualizó correctamente.`)
          window.location.href = "/productos"
        } else {
          setError(result.error || "Error al guardar el producto")
          alert(`Error: ${result.error || "No se pudo actualizar el producto"}`)
          setLoading(false)
        }
      } else {
        const productos = selectedTalles.map((talle) => ({
          codigo_sku: generateSKU(marca, modelo, color, talle),
          descripcion: generateDescription(marca, modelo, color, talle),
          marca,
          modelo,
          categoria: "Zapatillas",
          talle,
          color,
          costo: costoNum,
          stock_actual: 0,
          stock_minimo: 0,
        }))

        const result = await saveMultipleProducts(productos)
        if (result.success) {
          alert(`✓ Productos creados exitosamente\n\nSe crearon ${result.created} productos correctamente.`)
          window.location.href = "/productos"
        } else {
          setError(result.error || "Error al guardar los productos")
          alert(`Error: ${result.error || "No se pudieron crear los productos"}`)
          setLoading(false)
        }
      }
    } catch (err) {
      setError("Error al guardar el producto")
      alert("Error: Ocurrió un error inesperado al guardar el producto")
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!product?.id_producto) return

    setDeleting(true)
    setError("")

    try {
      const result = await deleteProduct(product.id_producto)
      if (result.success) {
        alert(`✓ Producto eliminado exitosamente\n\n${product.descripcion} fue eliminado correctamente.`)
        window.location.href = "/productos"
      } else {
        setError(result.error || "Error al eliminar el producto")
        alert(`Error: ${result.error || "No se pudo eliminar el producto"}`)
        setDeleting(false)
      }
    } catch (err) {
      setError("Error al eliminar el producto")
      alert("Error: Ocurrió un error inesperado al eliminar el producto")
      setDeleting(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
          {isEditing && product && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? "Eliminando..." : "Eliminar Producto"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción desactivará el producto <strong>{product.descripcion}</strong> del sistema. El producto
                    no se eliminará permanentemente, solo se marcará como inactivo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sí, eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          {success && <div className="p-3 rounded-md bg-green-500/10 text-green-600 text-sm">{success}</div>}

          {isEditing && product && (
            <div className="p-3 rounded-md bg-muted/50 border">
              <Label className="text-xs text-muted-foreground">SKU (no editable)</Label>
              <p className="font-mono font-medium text-sm mt-1">{product.codigo_sku}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca *</Label>
              {usarMarcaPersonalizada ? (
                <div className="space-y-2">
                  <Input
                    id="marcaPersonalizada"
                    placeholder="Escribir nueva marca..."
                    value={marcaPersonalizada}
                    onChange={(e) => setMarcaPersonalizada(e.target.value)}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUsarMarcaPersonalizada(false)
                      setMarcaPersonalizada("")
                    }}
                  >
                    ← Volver a lista de marcas
                  </Button>
                </div>
              ) : (
                <Select value={marcaSeleccionada} onValueChange={handleMarcaChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {marcasExistentes.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                    <SelectItem value="__otra__" className="text-primary font-medium">
                      + Agregar nueva marca...
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input
                id="modelo"
                placeholder="Samba, React, etc."
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="Blanca, Negra, etc."
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costo">Precio de Compra *</Label>
              <Input
                id="costo"
                type="number"
                step="0.01"
                min="0"
                placeholder="12000.00"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Talles *</Label>
              {!isEditing && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectAllTalles}
                    onCheckedChange={(checked) => handleSelectAllTalles(checked as boolean)}
                  />
                  <label htmlFor="selectAll" className="text-sm text-muted-foreground cursor-pointer">
                    Seleccionar todos (35-45)
                  </label>
                </div>
              )}
            </div>

            {isEditing ? (
              <Select value={selectedTalles[0] || ""} onValueChange={(v) => setSelectedTalles([v])}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar talle" />
                </SelectTrigger>
                <SelectContent>
                  {talles.map((talle) => (
                    <SelectItem key={talle} value={talle}>
                      {talle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {talles.map((talle) => (
                  <div
                    key={talle}
                    className={`flex items-center justify-center p-2 rounded-md border cursor-pointer transition-colors ${
                      selectedTalles.includes(talle)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-input"
                    }`}
                    onClick={() => handleTalleToggle(talle, !selectedTalles.includes(talle))}
                  >
                    <span className="font-medium">{talle}</span>
                  </div>
                ))}
              </div>
            )}

            {!isEditing && selectedTalles.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedTalles.length} talle(s) seleccionado(s). Se crearán {selectedTalles.length} producto(s).
              </p>
            )}
          </div>

          {marca && modelo && selectedTalles.length > 0 && (
            <div className="p-3 rounded-md bg-muted/50">
              <p className="text-sm font-medium mb-1">Vista previa:</p>
              <p className="text-xs text-muted-foreground">
                SKU: {generateSKU(marca, modelo, color || "SIN-COLOR", selectedTalles[0])}
                {selectedTalles.length > 1 && ` ... (${selectedTalles.length} productos)`}
              </p>
              <p className="text-xs text-muted-foreground">
                Descripción: {generateDescription(marca, modelo, color || "", selectedTalles[0])}
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            * El precio de venta se determina automáticamente según el tipo de venta
          </p>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading
                ? "Guardando..."
                : isEditing
                  ? "Actualizar"
                  : `Crear ${selectedTalles.length > 1 ? `${selectedTalles.length} Productos` : "Producto"}`}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
