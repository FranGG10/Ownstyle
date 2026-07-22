"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createIngresoEgreso } from "@/app/actions/ingresos-egresos"

const RUBROS = [
  { value: "publicidad", label: "Publicidad", tipo: "egreso", tipoFijo: true },
  { value: "contador", label: "Contador", tipo: "egreso", tipoFijo: true },
  { value: "impuestos", label: "Impuestos", tipo: "egreso", tipoFijo: true },
  { value: "gastos_varios", label: "Gastos Varios", tipo: "egreso", tipoFijo: true },
  { value: "flete", label: "Flete", tipo: "egreso", tipoFijo: true },
  { value: "alquiler", label: "Alquiler", tipo: "egreso", tipoFijo: true },
  { value: "auto", label: "Auto", tipo: "egreso", tipoFijo: true },
  { value: "retiros_titular", label: "Retiros del Titular", tipo: "egreso", tipoFijo: true },
  { value: "deuda_proveedores", label: "Deuda Proveedores", tipo: "ambos", tipoFijo: false },
  { value: "deuda_familiar", label: "Deuda Familiar", tipo: "ambos", tipoFijo: false },
  { value: "otros_ingresos", label: "Otros Ingresos", tipo: "ingreso", tipoFijo: true },
]

export function IngresoEgresoForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    tipo: "" as "ingreso" | "egreso" | "",
    categoria: "",
    descripcion: "",
    monto: "",
    medio_pago: "efectivo",
  })

  const handleRubroChange = (value: string) => {
    const rubro = RUBROS.find((r) => r.value === value)
    setFormData((prev) => ({
      ...prev,
      categoria: value,
      tipo: rubro?.tipoFijo ? (rubro?.tipo as "ingreso" | "egreso") : "",
    }))
  }

  const handleTipoChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      tipo: value as "ingreso" | "egreso",
    }))
  }

  const selectedRubro = RUBROS.find((r) => r.value === formData.categoria)
  const showTipoSelector = selectedRubro && !selectedRubro.tipoFijo

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.tipo || !formData.categoria || !formData.descripcion || !formData.monto) {
      setError("Por favor complete todos los campos")
      setLoading(false)
      return
    }

    const result = await createIngresoEgreso({
      fecha: formData.fecha,
      tipo: formData.tipo as "ingreso" | "egreso",
      categoria: formData.categoria,
      descripcion: formData.descripcion,
      monto: Number.parseFloat(formData.monto),
      medio_pago: formData.medio_pago,
    })

    setLoading(false)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        router.push("/ingresos-egresos")
      }, 1500)
    } else {
      setError(result.error || "Error al crear el movimiento")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <AlertDescription>Movimiento registrado exitosamente. Redirigiendo...</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha *</Label>
          <Input
            id="fecha"
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData((prev) => ({ ...prev, fecha: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoria">Rubro *</Label>
          <Select value={formData.categoria} onValueChange={handleRubroChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar rubro" />
            </SelectTrigger>
            <SelectContent>
              {RUBROS.map((rubro) => (
                <SelectItem key={rubro.value} value={rubro.value}>
                  {rubro.label}{rubro.tipoFijo ? ` (${rubro.tipo === "egreso" ? "Egreso" : "Ingreso"})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo *</Label>
          {showTipoSelector ? (
            <Select value={formData.tipo} onValueChange={handleTipoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">Ingreso (Recibo dinero prestado)</SelectItem>
                <SelectItem value="egreso">Egreso (Pago deuda)</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="tipo"
              value={formData.tipo === "ingreso" ? "Ingreso" : formData.tipo === "egreso" ? "Egreso" : ""}
              disabled
              className="bg-muted"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="monto">Monto *</Label>
          <Input
            id="monto"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={formData.monto}
            onChange={(e) => setFormData((prev) => ({ ...prev, monto: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="medio_pago">Medio de Pago *</Label>
          <Select
            value={formData.medio_pago}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, medio_pago: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar medio de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="descripcion">Descripción *</Label>
          <Textarea
            id="descripcion"
            placeholder="Descripción del movimiento..."
            value={formData.descripcion}
            onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Registrar Movimiento"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/ingresos-egresos")}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
