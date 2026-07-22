"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  X,
  Pencil,
  Trash2,
  Save,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { formatCurrency } from "@/lib/format"
import { useRouter } from "next/navigation"

interface PedidoCompraExcel {
  fecha: string
  numeroPedido: string
  proveedor: string
  medioPago: string
  items: { sku: string; cantidad: number }[]
}

interface ProductoEncontrado {
  sku: string
  id_producto: number
  nombre: string
  costo: number
  cantidad: number
  encontrado: boolean
}

interface PedidoCompraProcesado extends PedidoCompraExcel {
  productos: ProductoEncontrado[]
  valid: boolean
  errores: string[]
  totalCalculado: number
}

export function CargaMasivaComprasClient() {
  const router = useRouter()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [pedidos, setPedidos] = useState<PedidoCompraProcesado[]>([])
  const [procesando, setProcesando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<{
    exitosos: number
    fallidos: number
    errores: string[]
  } | null>(null)

  const [editandoIndex, setEditandoIndex] = useState<number | null>(null)
  const [pedidoEditado, setPedidoEditado] = useState<PedidoCompraProcesado | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setArchivo(file)
      setPedidos([])
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

      const dataRows = rows.slice(1).filter((row) => row.length > 0 && row[0])

      // Agrupar por número de pedido
      const pedidosMap = new Map<string, PedidoCompraExcel>()

      for (const row of dataRows) {
        const fecha = row[0] // A: Fecha
        const numeroPedido = String(row[1] || "").trim() // B: Pedido
        const proveedor = String(row[2] || "").trim() // C: Proveedor
        const medioPagoRaw = String(row[3] || "").trim().toLowerCase() // D: Medio de Pago
        const sku = String(row[4] || "").trim() // E: SKU
        const cantidadRaw = row[5] // F: Cantidad

        if (!numeroPedido || !sku) continue

        // Parsear fecha
        let fechaFormateada = ""
        if (fecha instanceof Date) {
          fechaFormateada = fecha.toISOString().split("T")[0]
        } else if (typeof fecha === "number") {
          const excelDate = new Date((fecha - 25569) * 86400 * 1000)
          fechaFormateada = excelDate.toISOString().split("T")[0]
        } else if (typeof fecha === "string") {
          const parts = fecha.split("/")
          if (parts.length === 3) {
            fechaFormateada = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
          }
        }

        // Parsear cantidad
        let cantidad = 1
        if (typeof cantidadRaw === "number") {
          cantidad = Math.max(1, Math.round(cantidadRaw))
        } else if (typeof cantidadRaw === "string") {
          cantidad = Math.max(1, Math.round(Number(cantidadRaw.replace(/[^\d]/g, "")) || 1))
        }

        // Medio de pago
        let medioPago = "efectivo"
        if (medioPagoRaw.includes("transfer")) {
          medioPago = "transferencia"
        } else if (medioPagoRaw.includes("tarjeta")) {
          medioPago = "tarjeta"
        }

        if (pedidosMap.has(numeroPedido)) {
          const existing = pedidosMap.get(numeroPedido)!
          existing.items.push({ sku, cantidad })
        } else {
          pedidosMap.set(numeroPedido, {
            fecha: fechaFormateada,
            numeroPedido,
            proveedor,
            medioPago,
            items: [{ sku, cantidad }],
          })
        }
      }

      // Obtener todos los SKUs de la BD
      const allSkus = Array.from(pedidosMap.values()).flatMap((p) => p.items.map((i) => i.sku))
      const response = await fetch("/api/productos/buscar-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus: allSkus }),
      })
      const productosDB = await response.json()

      // Procesar cada pedido
      const pedidosProcesados: PedidoCompraProcesado[] = []

      for (const pedido of pedidosMap.values()) {
        const errores: string[] = []
        const productos: ProductoEncontrado[] = []

        for (const item of pedido.items) {
          const producto = productosDB.find((p: any) => p.sku?.toLowerCase() === item.sku.toLowerCase())

          if (producto) {
            productos.push({
              sku: item.sku,
              id_producto: producto.id_producto,
              nombre: producto.nombre,
              costo: Number(producto.costo) || 0,
              cantidad: item.cantidad,
              encontrado: true,
            })
          } else {
            productos.push({
              sku: item.sku,
              id_producto: 0,
              nombre: "No encontrado",
              costo: 0,
              cantidad: item.cantidad,
              encontrado: false,
            })
            errores.push(`SKU no encontrado: ${item.sku}`)
          }
        }

        if (!pedido.fecha) errores.push("Fecha invalida")
        if (!pedido.proveedor) errores.push("Proveedor no especificado")

        const totalCalculado = productos
          .filter((p) => p.encontrado)
          .reduce((sum, p) => sum + p.costo * p.cantidad, 0)

        pedidosProcesados.push({
          ...pedido,
          productos,
          valid: errores.length === 0,
          errores,
          totalCalculado,
        })
      }

      setPedidos(pedidosProcesados)
    } catch (error: any) {
      console.error("Error procesando Excel:", error)
      alert("Error al procesar el archivo: " + error.message)
    } finally {
      setProcesando(false)
    }
  }

  const cargarCompras = async () => {
    const pedidosValidos = pedidos.filter((p) => p.valid)
    if (pedidosValidos.length === 0) {
      alert("No hay pedidos validos para cargar")
      return
    }

    setCargando(true)
    const errores: string[] = []
    let exitosos = 0
    let fallidos = 0

    try {
      const BATCH_SIZE = 3

      const resLast = await fetch("/api/compras/ultimo-comprobante")
      const { lastNum } = await resLast.json()
      let nextNum = lastNum + 1

      const pedidosConComprobante = pedidosValidos.map((pedido) => ({
        ...pedido,
        comprobanteAsignado: `C-${String(nextNum++).padStart(6, "0")}`,
      }))

      for (let i = 0; i < pedidosConComprobante.length; i += BATCH_SIZE) {
        const lote = pedidosConComprobante.slice(i, i + BATCH_SIZE)

        const resultados = await Promise.allSettled(
          lote.map(async (pedido) => {
            const response = await fetch("/api/compras/carga-masiva", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fecha: pedido.fecha,
                proveedor: pedido.proveedor,
                medioPago: pedido.medioPago,
                productos: pedido.productos.filter((p) => p.encontrado),
                numeroPedido: pedido.numeroPedido,
                numeroComprobante: pedido.comprobanteAsignado,
                total: pedido.totalCalculado,
              }),
            })

            const result = await response.json()
            return { pedido, result }
          })
        )

        for (const res of resultados) {
          if (res.status === "fulfilled") {
            if (res.value.result.success) {
              exitosos++
            } else {
              fallidos++
              errores.push(`Pedido ${res.value.pedido.numeroPedido}: ${res.value.result.error}`)
            }
          } else {
            fallidos++
            errores.push(`Error de red: ${res.reason}`)
          }
        }

        if (i + BATCH_SIZE < pedidosValidos.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      setResultado({ exitosos, fallidos, errores })
    } catch (error: any) {
      console.error("Error cargando compras:", error)
      setResultado({
        exitosos,
        fallidos: fallidos + 1,
        errores: [...errores, error.message],
      })
    } finally {
      setCargando(false)
    }
  }

  const eliminarPedido = (index: number) => {
    setPedidos(pedidos.filter((_, i) => i !== index))
  }

  const iniciarEdicion = (index: number) => {
    setEditandoIndex(index)
    setPedidoEditado({ ...pedidos[index] })
  }

  const guardarEdicion = () => {
    if (editandoIndex === null || !pedidoEditado) return

    const errores: string[] = []
    if (!pedidoEditado.fecha) errores.push("Fecha invalida")
    if (!pedidoEditado.proveedor) errores.push("Proveedor no especificado")
    if (pedidoEditado.productos.some((p) => !p.encontrado)) {
      pedidoEditado.productos
        .filter((p) => !p.encontrado)
        .forEach((p) => errores.push(`SKU no encontrado: ${p.sku}`))
    }

    const totalCalculado = pedidoEditado.productos
      .filter((p) => p.encontrado)
      .reduce((sum, p) => sum + p.costo * p.cantidad, 0)

    const nuevosPedidos = [...pedidos]
    nuevosPedidos[editandoIndex] = {
      ...pedidoEditado,
      valid: errores.length === 0,
      errores,
      totalCalculado,
    }
    setPedidos(nuevosPedidos)
    setEditandoIndex(null)
    setPedidoEditado(null)
  }

  const cancelarEdicion = () => {
    setEditandoIndex(null)
    setPedidoEditado(null)
  }

  const eliminarProductoEdicion = (index: number) => {
    if (!pedidoEditado) return
    const nuevosProductos = pedidoEditado.productos.filter((_, i) => i !== index)
    const nuevosItems = pedidoEditado.items.filter((_, i) => i !== index)
    setPedidoEditado({
      ...pedidoEditado,
      productos: nuevosProductos,
      items: nuevosItems,
    })
  }

  const pedidosValidos = pedidos.filter((p) => p.valid).length
  const pedidosInvalidos = pedidos.filter((p) => !p.valid).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/compras">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold">Carga Masiva de Compras</h2>
          <p className="text-sm text-muted-foreground">Importa multiples compras desde un archivo Excel</p>
        </div>
      </div>

      {/* Instrucciones */}
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Formato del archivo Excel</h3>
          <p className="text-sm text-muted-foreground mb-2">
            El archivo debe contener las siguientes columnas en orden:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">A: Fecha</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">B: Pedido</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">C: Proveedor</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">D: Medio de Pago</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">E: SKU</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">F: Cantidad</span>
          </div>
        </CardContent>
      </Card>

      {/* Zona de carga */}
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
                      setPedidos([])
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Quitar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Arrastra tu archivo Excel aqui o haz clic para seleccionar</p>
                  <p className="text-xs text-muted-foreground">Formatos soportados: .xlsx, .xls</p>
                </div>
              )}
            </div>

            {archivo && pedidos.length === 0 && (
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

      {/* Resultado final */}
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
                <p className="text-sm text-muted-foreground">Compras creadas</p>
              </div>
              {resultado.fallidos > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{resultado.fallidos}</p>
                  <p className="text-sm text-muted-foreground">Fallidas</p>
                </div>
              )}
            </div>

            {resultado.errores.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
                <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Errores:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {resultado.errores.map((error, i) => (
                    <li key={i}>{"- "}{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button onClick={() => router.push("/compras")}>Ver Compras</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setArchivo(null)
                  setPedidos([])
                  setResultado(null)
                }}
              >
                Cargar Otro Archivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista previa */}
      {pedidos.length > 0 && !resultado && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vista Previa de Compras</CardTitle>
                <CardDescription>Se encontraron {pedidos.length} compras en el archivo</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                {pedidosValidos > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {pedidosValidos} validos
                  </span>
                )}
                {pedidosInvalidos > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {pedidosInvalidos} con errores
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {pedidos.map((pedido, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    pedido.valid
                      ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                      : "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                  }`}
                >
                  {editandoIndex === index && pedidoEditado ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Editando Pedido #{pedidoEditado.numeroPedido}</h4>
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
                        <div>
                          <label className="text-xs text-muted-foreground">Fecha</label>
                          <Input
                            type="date"
                            value={pedidoEditado.fecha}
                            onChange={(e) => setPedidoEditado({ ...pedidoEditado, fecha: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Proveedor</label>
                          <Input
                            value={pedidoEditado.proveedor}
                            onChange={(e) => setPedidoEditado({ ...pedidoEditado, proveedor: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Medio de Pago</label>
                          <select
                            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                            value={pedidoEditado.medioPago}
                            onChange={(e) => setPedidoEditado({ ...pedidoEditado, medioPago: e.target.value })}
                          >
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="tarjeta">Tarjeta</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Productos</label>
                        {pedidoEditado.productos.map((prod, pIndex) => (
                          <div key={pIndex} className="flex items-center gap-2 text-sm">
                            <span className={`flex-1 ${prod.encontrado ? "text-foreground" : "text-red-500"}`}>
                              {prod.sku} - {prod.nombre} x{prod.cantidad}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500"
                              onClick={() => eliminarProductoEdicion(pIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">Pedido #{pedido.numeroPedido}</h4>
                          <span className="text-sm text-muted-foreground">{pedido.fecha}</span>
                          <span className="text-sm text-muted-foreground">{pedido.proveedor}</span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{pedido.medioPago}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {pedido.productos.map((prod, pIndex) => (
                            <span
                              key={pIndex}
                              className={`text-xs px-2 py-1 rounded ${
                                prod.encontrado
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              }`}
                            >
                              {prod.sku} x{prod.cantidad} {prod.encontrado && `(${formatCurrency(prod.costo)} c/u)`}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm font-medium mt-1">Total: {formatCurrency(pedido.totalCalculado)}</p>
                        {pedido.errores.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {pedido.errores.map((err, i) => (
                              <p key={i} className="text-xs text-red-500">
                                {err}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button size="sm" variant="ghost" onClick={() => iniciarEdicion(index)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => eliminarPedido(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={cargarCompras} disabled={cargando || pedidosValidos === 0} size="lg">
                {cargando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cargando compras...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Cargar {pedidosValidos} compra{pedidosValidos !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
