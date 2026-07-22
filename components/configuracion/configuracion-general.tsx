"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings, Save } from "lucide-react"
import { updateConfiguracion } from "@/app/actions/configuracion"

interface ConfiguracionGeneralProps {
  configuraciones: {
    id_config: number
    clave: string
    valor: string
    descripcion: string
    tipo: string
  }[]
}

export function ConfiguracionGeneral({ configuraciones }: ConfiguracionGeneralProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    configuraciones.forEach((c) => {
      initial[c.clave] = c.valor
    })
    return initial
  })

  const handleChange = (clave: string, valor: string) => {
    setValues((prev) => ({ ...prev, [clave]: valor }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage("")
    try {
      for (const [clave, valor] of Object.entries(values)) {
        await updateConfiguracion(clave, valor)
      }
      setMessage("Configuración guardada exitosamente")
    } catch (error) {
      setMessage("Error al guardar la configuración")
    } finally {
      setLoading(false)
    }
  }

  const getConfig = (clave: string) => configuraciones.find((c) => c.clave === clave)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Datos de la Empresa
          </CardTitle>
          <CardDescription>Información general del negocio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="empresa_nombre">Nombre de la Empresa</Label>
              <Input
                id="empresa_nombre"
                value={values.empresa_nombre || ""}
                onChange={(e) => handleChange("empresa_nombre", e.target.value)}
                placeholder="Mi Zapatería"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_cuit">CUIT</Label>
              <Input
                id="empresa_cuit"
                value={values.empresa_cuit || ""}
                onChange={(e) => handleChange("empresa_cuit", e.target.value)}
                placeholder="20-12345678-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración Contable</CardTitle>
          <CardDescription>Parámetros para la generación de asientos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Generar Asientos Automáticamente</Label>
              <p className="text-sm text-muted-foreground">Crear asientos contables al registrar ventas y compras</p>
            </div>
            <Switch
              checked={values.generar_asientos_auto === "true"}
              onCheckedChange={(checked) => handleChange("generar_asientos_auto", checked ? "true" : "false")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="iva_tasa">Tasa de IVA (%)</Label>
              <Input
                id="iva_tasa"
                type="number"
                value={values.iva_tasa || "21"}
                onChange={(e) => handleChange("iva_tasa", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas Contables Predeterminadas</CardTitle>
          <CardDescription>Códigos de cuentas para asientos automáticos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cuenta_caja">Cuenta Caja</Label>
              <Input
                id="cuenta_caja"
                value={values.cuenta_caja || ""}
                onChange={(e) => handleChange("cuenta_caja", e.target.value)}
                placeholder="1.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuenta_ventas">Cuenta Ventas</Label>
              <Input
                id="cuenta_ventas"
                value={values.cuenta_ventas || ""}
                onChange={(e) => handleChange("cuenta_ventas", e.target.value)}
                placeholder="4.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuenta_compras">Cuenta Mercaderías</Label>
              <Input
                id="cuenta_compras"
                value={values.cuenta_compras || ""}
                onChange={(e) => handleChange("cuenta_compras", e.target.value)}
                placeholder="1.1.3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuenta_iva_debito">Cuenta IVA Débito</Label>
              <Input
                id="cuenta_iva_debito"
                value={values.cuenta_iva_debito || ""}
                onChange={(e) => handleChange("cuenta_iva_debito", e.target.value)}
                placeholder="2.1.2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuenta_iva_credito">Cuenta IVA Crédito</Label>
              <Input
                id="cuenta_iva_credito"
                value={values.cuenta_iva_credito || ""}
                onChange={(e) => handleChange("cuenta_iva_credito", e.target.value)}
                placeholder="1.1.4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuenta_proveedores">Cuenta Proveedores</Label>
              <Input
                id="cuenta_proveedores"
                value={values.cuenta_proveedores || ""}
                onChange={(e) => handleChange("cuenta_proveedores", e.target.value)}
                placeholder="2.1.1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {message && (
        <div
          className={`p-3 rounded-md text-sm ${message.includes("Error") ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}
        >
          {message}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={loading}>
        <Save className="h-4 w-4 mr-2" />
        {loading ? "Guardando..." : "Guardar Configuración"}
      </Button>
    </div>
  )
}
