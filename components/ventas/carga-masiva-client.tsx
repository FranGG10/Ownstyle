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
  ClipboardPaste,
  Repeat,
} from "lucide-react"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { formatCurrency, hoyArgentina } from "@/lib/format"
import { useRouter } from "next/navigation"

interface PedidoExcel {
  fecha: string
  numeroPedido: string
  nombre: string
  telefono: string
  barrio: string
  direccion: string
  skus: string[]
  monto: number
  medioPago: string
}

interface ProductoEncontrado {
  sku: string
  id_producto: number
  nombre: string
  costo: number
  encontrado: boolean
}

interface ParCambioUI {
  entregado: ProductoEncontrado
  recibido: ProductoEncontrado
}

interface PedidoProcesado extends PedidoExcel {
  productos: ProductoEncontrado[]
  valid: boolean
  errores: string[]
  // Solo presentes cuando el pedido viene del modo "Pegar texto" y es un
  // cambio (detectado por "(cambio)" + "Devuelve/Le enviamos" en el texto).
  tipo?: "venta" | "cambio"
  motivoCambio?: string
  pares?: ParCambioUI[]
}

export function CargaMasivaClient() {
  const router = useRouter()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [pedidos, setPedidos] = useState<PedidoProcesado[]>([])
  const [procesando, setProcesando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<{
    exitosos: number
    fallidos: number
    errores: string[]
  } | null>(null)

  const [editandoIndex, setEditandoIndex] = useState<number | null>(null)
  const [pedidoEditado, setPedidoEditado] = useState<PedidoProcesado | null>(null)

  const [modo, setModo] = useState<"excel" | "texto">("excel")
  const [fechaTexto, setFechaTexto] = useState(hoyArgentina())
  const [textoPegado, setTextoPegado] = useState("")
  const [procesandoTexto, setProcesandoTexto] = useState(false)

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

      // Saltar la fila de encabezados
      const dataRows = rows.slice(1).filter((row) => row.length > 0 && row[0])

      // Agrupar por número de pedido
      const pedidosMap = new Map<string, PedidoExcel>()

      for (const row of dataRows) {
        const fecha = row[0] // Columna A - Fecha
        const numeroPedido = String(row[1] || "").trim() // Columna B - Pedido
        const nombre = String(row[2] || "").trim() // Columna C - Nombre
        const telefono = String(row[3] || "").trim() // Columna D - Teléfono
        const barrio = String(row[4] || "").trim() // Columna E - Barrio
        const direccion = String(row[5] || "").trim() // Columna F - Dirección
        // Columna G - Entre Calles (ignorada)
        const pedidoSKU = String(row[7] || "").trim() // Columna H - Pedido (SKUs)
        const montoRaw = row[8] // Columna I - Monto
        const formaPago = String(row[9] || "")
          .trim()
          .toLowerCase() // Columna J - Forma de Pago

        if (!numeroPedido) continue

        // Parsear monto
        let monto = 0
        if (typeof montoRaw === "number") {
          monto = montoRaw
        } else if (typeof montoRaw === "string") {
          monto = Number(montoRaw.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0
        }

        // Parsear fecha
        let fechaFormateada = ""
        if (fecha instanceof Date) {
          fechaFormateada = fecha.toISOString().split("T")[0]
        } else if (typeof fecha === "number") {
          // Excel guarda fechas como números
          const excelDate = new Date((fecha - 25569) * 86400 * 1000)
          fechaFormateada = excelDate.toISOString().split("T")[0]
        } else if (typeof fecha === "string") {
          // Intentar parsear DD/MM/YYYY
          const parts = fecha.split("/")
          if (parts.length === 3) {
            fechaFormateada = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
          }
        }

        // Parsear SKUs (pueden venir separados por saltos de línea o comas)
        const skus = pedidoSKU
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

        // Medio de pago
        let medioPago = "efectivo"
        if (formaPago.includes("transfer")) {
          medioPago = "transferencia"
        } else if (formaPago.includes("tarjeta")) {
          medioPago = "tarjeta"
        }

        if (pedidosMap.has(numeroPedido)) {
          // Agregar SKUs al pedido existente
          const existing = pedidosMap.get(numeroPedido)!
          existing.skus.push(...skus)
        } else {
          pedidosMap.set(numeroPedido, {
            fecha: fechaFormateada,
            numeroPedido,
            nombre,
            telefono,
            barrio,
            direccion,
            skus,
            monto,
            medioPago,
          })
        }
      }

      // Obtener todos los productos de la BD
      const response = await fetch("/api/productos/buscar-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skus: Array.from(pedidosMap.values()).flatMap((p) => p.skus),
        }),
      })
      const productosDB = await response.json()

      // Procesar cada pedido
      const pedidosProcesados: PedidoProcesado[] = []

      for (const pedido of pedidosMap.values()) {
        const errores: string[] = []
        const productos: ProductoEncontrado[] = []

        for (const sku of pedido.skus) {
          const producto = productosDB.find((p: any) => p.sku?.toLowerCase() === sku.toLowerCase())

          if (producto) {
            productos.push({
              sku,
              id_producto: producto.id_producto,
              nombre: producto.nombre,
              costo: Number(producto.costo) || 0,
              encontrado: true,
            })
          } else {
            productos.push({
              sku,
              id_producto: 0,
              nombre: "No encontrado",
              costo: 0,
              encontrado: false,
            })
            errores.push(`SKU no encontrado: ${sku}`)
          }
        }

        if (!pedido.fecha) {
          errores.push("Fecha inválida")
        }

        if (pedido.monto <= 0) {
          errores.push("Monto inválido")
        }

        pedidosProcesados.push({
          ...pedido,
          productos,
          valid: errores.length === 0,
          errores,
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

  const procesarTexto = async () => {
    if (!textoPegado.trim()) return

    setProcesandoTexto(true)
    try {
      const response = await fetch("/api/interpretar-pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "ventas", texto: textoPegado, fecha: fechaTexto }),
      })
      const data = await response.json()

      if (data.error) {
        alert("Error al interpretar el texto: " + data.error)
        return
      }

      const mapProducto = (p: any): ProductoEncontrado => ({
        sku: p.sku || p.fraseOriginal,
        id_producto: p.id_producto || 0,
        nombre: p.nombre || p.fraseOriginal,
        costo: Number(p.costo) || 0,
        encontrado: Boolean(p.encontrado),
      })

      const pedidosProcesados: PedidoProcesado[] = (data.pedidos || []).map((p: any) => {
        const base = {
          fecha: p.fecha,
          numeroPedido: p.numeroPedido,
          nombre: p.cliente,
          telefono: "",
          barrio: p.cliente,
          direccion: "",
          skus: [],
          monto: p.importe,
          valid: p.errores.length === 0,
          errores: p.errores as string[],
        }

        if (p.tipo === "cambio") {
          const pares: ParCambioUI[] = p.pares.map((par: any) => ({
            entregado: mapProducto(par.entregado),
            recibido: mapProducto(par.recibido),
          }))
          return {
            ...base,
            medioPago: "efectivo",
            productos: [],
            tipo: "cambio" as const,
            motivoCambio: p.motivo,
            pares,
          }
        }

        return {
          ...base,
          medioPago: p.medioPago || "efectivo",
          productos: (p.productos || []).map(mapProducto),
          tipo: "venta" as const,
        }
      })

      setPedidos(pedidosProcesados)
    } catch (error: any) {
      console.error("Error procesando texto:", error)
      alert("Error al interpretar el texto: " + error.message)
    } finally {
      setProcesandoTexto(false)
    }
  }

  const cargarVentas = async () => {
    const pedidosValidos = pedidos.filter((p) => p.valid)
    if (pedidosValidos.length === 0) {
      alert("No hay pedidos válidos para cargar")
      return
    }

    setCargando(true)
    const errores: string[] = []
    let exitosos = 0
    let fallidos = 0

    try {
      const BATCH_SIZE = 3

      // Obtener el último número de comprobante antes de empezar
      const resLast = await fetch("/api/ventas/ultimo-comprobante")
      const { lastNum } = await resLast.json()
      let nextNum = lastNum + 1

      // Asignar un número de comprobante único a cada pedido
      const pedidosConComprobante = pedidosValidos.map((pedido) => ({
        ...pedido,
        comprobanteAsignado: `V-${String(nextNum++).padStart(6, "0")}`,
      }))

      for (let i = 0; i < pedidosConComprobante.length; i += BATCH_SIZE) {
        const lote = pedidosConComprobante.slice(i, i + BATCH_SIZE)

        const resultados = await Promise.allSettled(
          lote.map(async (pedido) => {
            // Los cambios (detectados por el modo "Pegar texto") van a su
            // propio endpoint, no al de ventas.
            if (pedido.tipo === "cambio" && pedido.pares) {
              const response = await fetch("/api/cambios/carga-masiva", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fecha: pedido.fecha,
                  nombreCliente: pedido.nombre,
                  telefono: pedido.telefono,
                  motivo: pedido.motivoCambio || "Cambio",
                  pares: pedido.pares.map((par) => ({
                    idProductoEntregado: par.entregado.id_producto,
                    idProductoRecibido: par.recibido.id_producto,
                  })),
                }),
              })

              const result = await response.json()
              return { pedido, result }
            }

            const response = await fetch("/api/ventas/carga-masiva", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fecha: pedido.fecha,
                nombre: pedido.nombre,
                telefono: pedido.telefono,
                barrio: pedido.barrio,
                direccion: pedido.direccion,
                monto: pedido.monto,
                medioPago: pedido.medioPago,
                productos: pedido.productos.filter((p) => p.encontrado),
                numeroPedido: pedido.numeroPedido,
                numeroComprobante: pedido.comprobanteAsignado,
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

        // Pausa entre lotes para no saturar la base de datos
        if (i + BATCH_SIZE < pedidosValidos.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      setResultado({ exitosos, fallidos, errores })
    } catch (error: any) {
      console.error("Error cargando ventas:", error)
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

    // Recalcular validez
    const errores: string[] = []
    if (!pedidoEditado.fecha) errores.push("Fecha inválida")
    if (pedidoEditado.monto <= 0) errores.push("Monto inválido")
    if (pedidoEditado.productos.some((p) => !p.encontrado)) {
      pedidoEditado.productos
        .filter((p) => !p.encontrado)
        .forEach((p) => {
          errores.push(`SKU no encontrado: ${p.sku}`)
        })
    }

    const nuevosPedidos = [...pedidos]
    nuevosPedidos[editandoIndex] = {
      ...pedidoEditado,
      valid: errores.length === 0,
      errores,
    }
    setPedidos(nuevosPedidos)
    setEditandoIndex(null)
    setPedidoEditado(null)
  }

  const cancelarEdicion = () => {
    setEditandoIndex(null)
    setPedidoEditado(null)
  }

  const eliminarProductoEdicion = (skuIndex: number) => {
    if (!pedidoEditado) return
    const nuevosProductos = pedidoEditado.productos.filter((_, i) => i !== skuIndex)
    const nuevosSkus = pedidoEditado.skus.filter((_, i) => i !== skuIndex)
    setPedidoEditado({
      ...pedidoEditado,
      productos: nuevosProductos,
      skus: nuevosSkus,
    })
  }

  const pedidosValidos = pedidos.filter((p) => p.valid).length
  const pedidosInvalidos = pedidos.filter((p) => !p.valid).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ventas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold">Carga Masiva de Ventas</h2>
          <p className="text-sm text-muted-foreground">Importa múltiples ventas (y cambios) desde un Excel o pegando el texto</p>
        </div>
      </div>

      {!resultado && (
        <div className="flex items-center gap-2">
          <Button variant={modo === "excel" ? "default" : "outline"} size="sm" onClick={() => setModo("excel")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant={modo === "texto" ? "default" : "outline"} size="sm" onClick={() => setModo("texto")}>
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Pegar texto
          </Button>
        </div>
      )}

      {modo === "excel" && (
        <>
          {/* Instrucciones */}
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
            <CardContent className="p-4">
              <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Formato del archivo Excel</h3>
              <p className="text-sm text-muted-foreground mb-2">
                El archivo debe contener las siguientes columnas en orden:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">A: Fecha</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">B: Nº Pedido</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">C: Nombre</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">D: Teléfono</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">E: Barrio</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">F: Dirección</span>
                <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">G: Entre Calles</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">H: SKU</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">I: Monto</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">J: Forma Pago</span>
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
                      <p className="text-muted-foreground">Arrastra tu archivo Excel aquí o haz clic para seleccionar</p>
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
        </>
      )}

      {modo === "texto" && !resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pegar texto de WhatsApp</CardTitle>
            <CardDescription>
              Pegá el listado tal cual te lo manda el cliente. Reconoce ventas y cambios (marcados con "(cambio)" +
              "Devuelve:"/"Le enviamos:") automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs space-y-1">
              <Label className="text-xs">Fecha del pedido</Label>
              <Input type="date" value={fechaTexto} onChange={(e) => setFechaTexto(e.target.value)} />
            </div>
            <textarea
              value={textoPegado}
              onChange={(e) => setTextoPegado(e.target.value)}
              placeholder={"Sáenz Peña $65.000\nHyline negra 38\nPuma blanca 38\n..."}
              className="w-full min-h-[280px] rounded-md border bg-background p-3 text-sm font-mono"
            />
            <div className="flex justify-center">
              <Button onClick={procesarTexto} disabled={procesandoTexto || !textoPegado.trim()}>
                {procesandoTexto ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Interpretando...
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    Interpretar
                  </>
                )}
              </Button>
            </div>
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
                <p className="text-sm text-muted-foreground">Registros creados</p>
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
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button onClick={() => router.push("/ventas")}>Ver Ventas</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setArchivo(null)
                  setTextoPegado("")
                  setPedidos([])
                  setResultado(null)
                }}
              >
                Cargar Otro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista previa de pedidos */}
      {pedidos.length > 0 && !resultado && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vista Previa de Pedidos</CardTitle>
                <CardDescription>Se encontraron {pedidos.length} pedidos en el archivo</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                {pedidosValidos > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {pedidosValidos} válidos
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
                  className={`
                    border rounded-lg p-4 
                    ${
                      pedido.valid
                        ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                        : "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                    }
                  `}
                >
                  {editandoIndex === index && pedidoEditado && pedidoEditado.tipo !== "cambio" ? (
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
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha</Label>
                          <Input
                            type="date"
                            value={pedidoEditado.fecha}
                            onChange={(e) => setPedidoEditado({ ...pedidoEditado, fecha: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre</Label>
                          <Input
                            value={pedidoEditado.nombre}
                            onChange={(e) => setPedidoEditado({ ...pedidoEditado, nombre: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Teléfono</Label>
                          <Input
                            value={pedidoEditado.telefono}
                            onChange={(e) => setPedidoEditado({ ...pedidoEditado, telefono: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Monto</Label>
                          <Input
                            type="number"
                            value={pedidoEditado.monto}
                            onChange={(e) => setPedidoEditado({ ...pedidoEditado, monto: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Barrio</Label>
                          <Input
                            value={pedidoEditado.barrio}
                            onChange={(e) => setPedidoEditado({ ...pedidoEditado, barrio: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs">Dirección</Label>
                          <Input
                            value={pedidoEditado.direccion}
                            onChange={(e) => setPedidoEditado({ ...pedidoEditado, direccion: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Medio de Pago</Label>
                          <select
                            className="w-full h-9 px-3 rounded-md border bg-background text-sm"
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
                        <Label className="text-xs">Productos</Label>
                        <div className="flex flex-wrap gap-2">
                          {pedidoEditado.productos.map((producto, pIndex) => (
                            <span
                              key={pIndex}
                              className={`
                                inline-flex items-center gap-1 text-xs px-2 py-1 rounded
                                ${
                                  producto.encontrado
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }
                              `}
                            >
                              <Package className="h-3 w-3" />
                              {producto.sku}
                              <button
                                type="button"
                                onClick={() => eliminarProductoEdicion(pIndex)}
                                className="ml-1 hover:bg-black/10 rounded p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            Pedido #{pedido.numeroPedido}
                            {pedido.tipo === "cambio" && (
                              <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded">
                                <Repeat className="h-3 w-3" />
                                Cambio
                              </span>
                            )}
                            {pedido.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {pedido.fecha} • {pedido.nombre}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-4">
                            <p className="font-semibold text-lg">{formatCurrency(pedido.monto)}</p>
                            {pedido.tipo !== "cambio" && (
                              <p className="text-xs text-muted-foreground capitalize">{pedido.medioPago}</p>
                            )}
                          </div>
                          {pedido.tipo !== "cambio" && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 bg-transparent"
                              onClick={() => iniciarEdicion(index)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                            onClick={() => eliminarPedido(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {pedido.tipo === "cambio" ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Pares entrega / devuelve:</p>
                          <div className="space-y-1">
                            {(pedido.pares || []).map((par, parIndex) => (
                              <div key={parIndex} className="flex items-center gap-2 text-xs flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                                    par.recibido.encontrado
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  }`}
                                >
                                  <Package className="h-3 w-3" />
                                  Devuelve: {par.recibido.sku}
                                </span>
                                <Repeat className="h-3 w-3 text-muted-foreground" />
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                                    par.entregado.encontrado
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  }`}
                                >
                                  <Package className="h-3 w-3" />
                                  Entrega: {par.entregado.sku}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Teléfono:</span> {pedido.telefono || "-"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Barrio:</span> {pedido.barrio || "-"}
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Dirección:</span> {pedido.direccion || "-"}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Productos:</p>
                            <div className="flex flex-wrap gap-2">
                              {pedido.productos.map((producto, pIndex) => (
                                <span
                                  key={pIndex}
                                  className={`
                                    inline-flex items-center gap-1 text-xs px-2 py-1 rounded
                                    ${
                                      producto.encontrado
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    }
                                  `}
                                >
                                  <Package className="h-3 w-3" />
                                  {producto.sku}
                                  {producto.encontrado && ` (${formatCurrency(producto.costo)})`}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {!pedido.valid && (
                        <div className="mt-3 text-sm text-red-600">
                          <p className="font-medium">Errores:</p>
                          <ul className="list-disc list-inside">
                            {pedido.errores.map((error, eIndex) => (
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

            {pedidosValidos > 0 && (
              <div className="mt-6 flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setArchivo(null)
                    setTextoPegado("")
                    setPedidos([])
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={cargarVentas} disabled={cargando}>
                  {cargando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Cargar {pedidosValidos} Registro{pedidosValidos !== 1 ? "s" : ""}
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
