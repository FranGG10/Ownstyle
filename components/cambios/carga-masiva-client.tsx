"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Package,
  Loader2,
  X,
  Pencil,
  Trash2,
  Save,
  Repeat,
} from "lucide-react"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { useRouter } from "next/navigation"

interface CambioExcel {
  fecha: string
  cliente: string
  telefono: string
  motivo: string
  skuEntrega: string
  skuDevuelve: string
}

interface ProductoEncontrado {
  sku: string
  id_producto: number
  nombre: string
  encontrado: boolean
}

interface CambioProcesado extends CambioExcel {
  productoEntregado: ProductoEncontrado
  productoDevuelto: ProductoEncontrado
  valid: boolean
  errores: string[]
}

function parsearFecha(fecha: any): string {
  if (fecha instanceof Date) {
    return fecha.toISOString().split("T")[0]
  }
  if (typeof fecha === "number") {
    // Excel guarda fechas como números de serie
    const excelDate = new Date((fecha - 25569) * 86400 * 1000)
    return excelDate.toISOString().split("T")[0]
  }
  if (typeof fecha === "string") {
    const parts = fecha.split("/")
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
    }
  }
  return ""
}

function validarCambio(cambio: Omit<CambioProcesado, "valid" | "errores">): string[] {
  const errores: string[] = []
  if (!cambio.fecha) errores.push("Fecha inválida")
  if (!cambio.motivo) errores.push("Falta el motivo del cambio")
  if (!cambio.productoEntregado.encontrado) errores.push(`SKU no encontrado (entrega): ${cambio.skuEntrega}`)
  if (!cambio.productoDevuelto.encontrado) errores.push(`SKU no encontrado (devuelve): ${cambio.skuDevuelve}`)
  return errores
}

export function CambiosCargaMasivaClient() {
  const router = useRouter()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [cambios, setCambios] = useState<CambioProcesado[]>([])
  const [procesando, setProcesando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<{
    exitosos: number
    fallidos: number
    errores: string[]
  } | null>(null)

  const [editandoIndex, setEditandoIndex] = useState<number | null>(null)
  const [cambioEditado, setCambioEditado] = useState<CambioProcesado | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setArchivo(file)
      setCambios([])
      setResultado(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  })

  const procesarExcel = async () => {
    if (!archivo) return

    setProcesando(true)
    try {
      const data = await archivo.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

      // Saltar la fila de encabezados
      const dataRows = rows.slice(1).filter((row) => row.length > 0 && row[0])

      const filas: CambioExcel[] = dataRows.map((row) => ({
        fecha: parsearFecha(row[0]), // Columna A - Fecha
        cliente: String(row[1] || "").trim(), // Columna B - Cliente
        telefono: String(row[2] || "").trim(), // Columna C - Teléfono
        motivo: String(row[3] || "").trim(), // Columna D - Motivo del cambio
        skuEntrega: String(row[4] || "").trim(), // Columna E - Zapatilla que entrega
        skuDevuelve: String(row[5] || "").trim(), // Columna F - Zapatilla que devuelve
      }))

      const todosLosSkus = Array.from(
        new Set(filas.flatMap((f) => [f.skuEntrega, f.skuDevuelve]).filter((s) => s.length > 0)),
      )

      const response = await fetch("/api/productos/buscar-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus: todosLosSkus }),
      })
      const productosDB = await response.json()

      const buscarProducto = (sku: string): ProductoEncontrado => {
        const producto = productosDB.find((p: any) => p.sku?.toLowerCase() === sku.toLowerCase())
        if (producto) {
          return { sku, id_producto: producto.id_producto, nombre: producto.nombre, encontrado: true }
        }
        return { sku, id_producto: 0, nombre: "No encontrado", encontrado: false }
      }

      const cambiosProcesados: CambioProcesado[] = filas.map((fila) => {
        const productoEntregado = buscarProducto(fila.skuEntrega)
        const productoDevuelto = buscarProducto(fila.skuDevuelve)
        const base = { ...fila, productoEntregado, productoDevuelto }
        return { ...base, valid: validarCambio(base).length === 0, errores: validarCambio(base) }
      })

      setCambios(cambiosProcesados)
    } catch (error: any) {
      console.error("Error procesando Excel:", error)
      alert("Error al procesar el archivo: " + error.message)
    } finally {
      setProcesando(false)
    }
  }

  const cargarCambios = async () => {
    const cambiosValidos = cambios.filter((c) => c.valid)
    if (cambiosValidos.length === 0) {
      alert("No hay cambios válidos para cargar")
      return
    }

    setCargando(true)
    const errores: string[] = []
    let exitosos = 0
    let fallidos = 0

    try {
      const BATCH_SIZE = 3

      for (let i = 0; i < cambiosValidos.length; i += BATCH_SIZE) {
        const lote = cambiosValidos.slice(i, i + BATCH_SIZE)

        const resultados = await Promise.allSettled(
          lote.map(async (cambio) => {
            const response = await fetch("/api/cambios/carga-masiva", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fecha: cambio.fecha,
                nombreCliente: cambio.cliente,
                telefono: cambio.telefono,
                motivo: cambio.motivo,
                pares: [
                  {
                    idProductoEntregado: cambio.productoEntregado.id_producto,
                    idProductoRecibido: cambio.productoDevuelto.id_producto,
                  },
                ],
              }),
            })

            const result = await response.json()
            return { cambio, result }
          }),
        )

        for (const res of resultados) {
          if (res.status === "fulfilled") {
            if (res.value.result.success) {
              exitosos++
            } else {
              fallidos++
              errores.push(`${res.value.cambio.cliente || "Cambio"} (${res.value.cambio.fecha}): ${res.value.result.error}`)
            }
          } else {
            fallidos++
            errores.push(`Error de red: ${res.reason}`)
          }
        }

        if (i + BATCH_SIZE < cambiosValidos.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      setResultado({ exitosos, fallidos, errores })
    } catch (error: any) {
      console.error("Error cargando cambios:", error)
      setResultado({ exitosos, fallidos: fallidos + 1, errores: [...errores, error.message] })
    } finally {
      setCargando(false)
    }
  }

  const eliminarCambioFila = (index: number) => {
    setCambios(cambios.filter((_, i) => i !== index))
  }

  const iniciarEdicion = (index: number) => {
    setEditandoIndex(index)
    setCambioEditado({ ...cambios[index] })
  }

  const guardarEdicion = () => {
    if (editandoIndex === null || !cambioEditado) return

    const errores = validarCambio(cambioEditado)
    const nuevosCambios = [...cambios]
    nuevosCambios[editandoIndex] = { ...cambioEditado, valid: errores.length === 0, errores }
    setCambios(nuevosCambios)
    setEditandoIndex(null)
    setCambioEditado(null)
  }

  const cancelarEdicion = () => {
    setEditandoIndex(null)
    setCambioEditado(null)
  }

  const cambiosValidos = cambios.filter((c) => c.valid).length
  const cambiosInvalidos = cambios.filter((c) => !c.valid).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cambios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold">Carga Masiva de Cambios</h2>
          <p className="text-sm text-muted-foreground">Importa múltiples cambios desde un archivo Excel</p>
        </div>
      </div>

      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Formato del archivo Excel</h3>
          <p className="text-sm text-muted-foreground mb-2">
            El archivo debe contener las siguientes columnas en orden. Las marcadas con * son obligatorias.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">A: Fecha*</span>
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">B: Cliente</span>
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">C: Teléfono</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">D: Motivo*</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">E: SKU Entrega*</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">F: SKU Devuelve*</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Cada cambio queda registrado como <strong>pendiente</strong>: la zapatilla que entrega descuenta stock al
            cargarse, y la que devuelve recién repone stock cuando se marca el cambio como completado.
          </p>
        </CardContent>
      </Card>

      {!resultado && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
              `}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {archivo ? (
                <div className="space-y-2">
                  <p className="font-medium text-foreground">{archivo.name}</p>
                  <p className="text-sm text-muted-foreground">{(archivo.size / 1024).toFixed(1)} KB</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setArchivo(null)
                      setCambios([])
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Quitar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Arrastra tu archivo Excel aquí o haz clic para seleccionar</p>
                  <p className="text-xs text-muted-foreground">Formatos soportados: .xlsx, .xls</p>
                </div>
              )}
            </div>

            {archivo && cambios.length === 0 && (
              <div className="mt-4 flex justify-center">
                <Button onClick={procesarExcel} disabled={procesando}>
                  {procesando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Procesar Excel
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {resultado && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Carga Completada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{resultado.exitosos}</p>
                <p className="text-sm text-muted-foreground">Cambios creados</p>
              </div>
              {resultado.fallidos > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{resultado.fallidos}</p>
                  <p className="text-sm text-muted-foreground">Fallidos</p>
                </div>
              )}
            </div>

            {resultado.errores.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
                <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Errores:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {resultado.errores.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button onClick={() => router.push("/cambios")}>Ver Cambios</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setArchivo(null)
                  setCambios([])
                  setResultado(null)
                }}
              >
                Cargar Otro Archivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {cambios.length > 0 && !resultado && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vista Previa de Cambios</CardTitle>
                <CardDescription>Se encontraron {cambios.length} cambios en el archivo</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                {cambiosValidos > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {cambiosValidos} válidos
                  </span>
                )}
                {cambiosInvalidos > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {cambiosInvalidos} con errores
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {cambios.map((cambio, index) => (
                <div
                  key={index}
                  className={`
                    border rounded-lg p-4
                    ${
                      cambio.valid
                        ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                        : "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                    }
                  `}
                >
                  {editandoIndex === index && cambioEditado ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Editando cambio</h4>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={cancelarEdicion}>
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={guardarEdicion}>
                            <Save className="h-4 w-4 mr-1" />
                            Guardar
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha</Label>
                          <Input
                            type="date"
                            value={cambioEditado.fecha}
                            onChange={(e) => setCambioEditado({ ...cambioEditado, fecha: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cliente</Label>
                          <Input
                            value={cambioEditado.cliente}
                            onChange={(e) => setCambioEditado({ ...cambioEditado, cliente: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Teléfono</Label>
                          <Input
                            value={cambioEditado.telefono}
                            onChange={(e) => setCambioEditado({ ...cambioEditado, telefono: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Motivo</Label>
                          <Input
                            value={cambioEditado.motivo}
                            onChange={(e) => setCambioEditado({ ...cambioEditado, motivo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">SKU Entrega</Label>
                          <Input
                            value={cambioEditado.skuEntrega}
                            onChange={(e) =>
                              setCambioEditado({
                                ...cambioEditado,
                                skuEntrega: e.target.value,
                                productoEntregado: { ...cambioEditado.productoEntregado, sku: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">SKU Devuelve</Label>
                          <Input
                            value={cambioEditado.skuDevuelve}
                            onChange={(e) =>
                              setCambioEditado({
                                ...cambioEditado,
                                skuDevuelve: e.target.value,
                                productoDevuelto: { ...cambioEditado.productoDevuelto, sku: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Si cambiás un SKU acá, tenés que reprocesar el archivo para que se vuelva a buscar en el
                        catálogo (por ahora solo actualiza el texto).
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            {cambio.cliente || "Sin cliente"}
                            {cambio.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {cambio.fecha} • {cambio.telefono || "-"} • {cambio.motivo || "Sin motivo"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 bg-transparent"
                            onClick={() => iniciarEdicion(index)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                            onClick={() => eliminarCambioFila(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                            cambio.productoEntregado.encontrado
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          <Package className="h-3 w-3" />
                          Entrega: {cambio.skuEntrega || "-"}
                          {cambio.productoEntregado.encontrado && ` (${cambio.productoEntregado.nombre})`}
                        </span>
                        <span className="flex items-center text-muted-foreground">
                          <Repeat className="h-3 w-3" />
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                            cambio.productoDevuelto.encontrado
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          <Package className="h-3 w-3" />
                          Devuelve: {cambio.skuDevuelve || "-"}
                          {cambio.productoDevuelto.encontrado && ` (${cambio.productoDevuelto.nombre})`}
                        </span>
                      </div>

                      {!cambio.valid && (
                        <div className="mt-3 text-sm text-red-600">
                          <p className="font-medium">Errores:</p>
                          <ul className="list-disc list-inside">
                            {cambio.errores.map((error, eIndex) => (
                              <li key={eIndex}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {cambiosValidos > 0 && (
              <div className="mt-6 flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setArchivo(null)
                    setCambios([])
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={cargarCambios} disabled={cargando}>
                  {cargando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Cargar {cambiosValidos} Cambio{cambiosValidos !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
