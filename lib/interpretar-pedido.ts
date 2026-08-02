import { sql } from "@/lib/db"

// Parser de reglas (sin IA, sin costo) que interpreta el texto de WhatsApp que
// hoy Francisco pasa manualmente por un Project de Claude, usando el mismo
// criterio que ya tenía afinado en sus prompts (Prompts_Reportes.md): separar
// pedidos por "Barrio $Monto", reconocer cambios por "(cambio)" + "Devuelve/Le
// enviamos", y resolver cada frase de producto contra el Diccionario
// (typos/apodos ya conocidos) + match difuso para variantes nuevas parecidas.
// La validación final de que el SKU+talle exista de verdad es siempre un
// SELECT contra la tabla real `productos` (igual que ya hace
// /api/productos/buscar-skus con la carga por Excel) - nunca se inventa un
// SKU: lo que no se puede resolver con confianza queda marcado en rojo para
// que el usuario lo corrija a mano en el preview, como ya pasa hoy.

export interface EntradaDiccionario {
  frase: string
  sku_base: string
  marca: string
  modelo: string
}

export interface ProductoResuelto {
  fraseOriginal: string
  talle: number | null
  sku: string | null
  id_producto: number | null
  nombre: string | null
  costo: number | null
  cantidad: number
  encontrado: boolean
  motivoError?: string
}

export interface PedidoVentaResuelto {
  tipo: "venta"
  numeroPedido: string
  fecha: string
  cliente: string
  importe: number
  medioPago: string
  productos: ProductoResuelto[]
  errores: string[]
}

export interface PedidoCambioResuelto {
  tipo: "cambio"
  numeroPedido: string
  fecha: string
  cliente: string
  importe: number
  motivo: string
  pares: { entregado: ProductoResuelto; recibido: ProductoResuelto }[]
  errores: string[]
}

export interface PedidoCompraResuelto {
  numeroPedido: string
  fecha: string
  proveedor: string
  medioPago: string
  productos: ProductoResuelto[]
  errores: string[]
}

// ---------- Utilidades de texto ----------

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function distanciaEdicion(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

interface ResultadoMatch {
  entrada: EntradaDiccionario | null
  motivoError?: string
}

// Umbral de confianza para el match difuso: distancia de edición / longitud
// del string más largo. 0.3 tolera un par de letras cambiadas en frases
// cortas ("AIRFROCE" vs "Airforce", "MA BCO" vs "MQ BCO").
const UMBRAL_DISTANCIA = 0.3

function buscarEnDiccionario(fraseOriginal: string, diccionario: EntradaDiccionario[]): ResultadoMatch {
  const norm = normalizar(fraseOriginal)
  if (!norm) return { entrada: null, motivoError: "Falta el nombre del producto" }

  const exacto = diccionario.find((d) => normalizar(d.frase) === norm)
  if (exacto) return { entrada: exacto }

  // Códigos cortos sin el prefijo de línea (ej. "BB", "NN" en vez de "MQ BB", "MQ NN")
  const conPrefijoMQ = normalizar(`MQ ${fraseOriginal}`)
  const exactoPrefijo = diccionario.find((d) => normalizar(d.frase) === conPrefijoMQ)
  if (exactoPrefijo) return { entrada: exactoPrefijo }

  // Match difuso: typos (AIRFROCE, MA en vez de MQ, etc.)
  let mejor: { entrada: EntradaDiccionario; score: number } | null = null
  let segundoMejorScore = Infinity
  for (const d of diccionario) {
    const dn = normalizar(d.frase)
    const score = distanciaEdicion(norm, dn) / Math.max(norm.length, dn.length, 1)
    if (!mejor || score < mejor.score) {
      segundoMejorScore = mejor ? mejor.score : Infinity
      mejor = { entrada: d, score }
    } else if (score < segundoMejorScore) {
      segundoMejorScore = score
    }
  }

  if (mejor && mejor.score <= UMBRAL_DISTANCIA && segundoMejorScore - mejor.score >= 0.05) {
    return { entrada: mejor.entrada }
  }

  return { entrada: null, motivoError: `No se pudo identificar el producto: "${fraseOriginal}"` }
}

// ---------- Parseo de una línea de producto ("Hyline negra 38", "270 clásica 37-42", "MQ BCO (x3)") ----------

interface ItemLinea {
  frase: string
  talles: number[]
  cantidadPorTalle: number
}

function parseProductoLinea(lineaOriginal: string): ItemLinea {
  let linea = lineaOriginal.trim()

  let cantidadPorTalle = 1
  const multMatch = linea.match(/\(?\s*x\s*(\d+)\s*\)?\s*$/i)
  if (multMatch && multMatch.index !== undefined) {
    cantidadPorTalle = Number.parseInt(multMatch[1], 10)
    linea = linea.slice(0, multMatch.index).trim()
  }

  // Palabras de relleno antes de un número final ("la misma en 40" -> "la misma 40")
  linea = linea.replace(/\ben\s+(\d)/i, "$1")

  let talles: number[] = []
  let frase = linea

  const rangoMatch = linea.match(/(\d{2,3}(?:\s*-\s*\d{2,3})+)\s*$/)
  if (rangoMatch && rangoMatch.index !== undefined) {
    const numeros = rangoMatch[1].split("-").map((n) => Number.parseInt(n.trim(), 10))
    frase = linea.slice(0, rangoMatch.index).trim()
    if (numeros.length === 2 && numeros[1] > numeros[0] && numeros[1] - numeros[0] <= 15) {
      for (let t = numeros[0]; t <= numeros[1]; t++) talles.push(t)
    } else {
      talles = numeros
    }
  } else {
    const talleMatch = linea.match(/(\d{2,3})\s*$/)
    if (talleMatch && talleMatch.index !== undefined) {
      talles = [Number.parseInt(talleMatch[1], 10)]
      frase = linea.slice(0, talleMatch.index).trim()
    }
  }

  frase = frase.replace(/[/,;:.\-]+$/, "").trim()

  return { frase, talles, cantidadPorTalle }
}

function parsearMonto(raw: string): number {
  return Number.parseInt(raw.replace(/\./g, "").replace(",", "").trim(), 10) || 0
}

// ---------- Resolución de un ítem contra Diccionario + catálogo real ----------

function resolverProducto(
  item: { frase: string; talle: number | null },
  diccionario: EntradaDiccionario[],
  productosPorSku: Map<string, { id_producto: number; nombre: string; costo: number }>,
  cantidad: number,
  entradaForzada?: EntradaDiccionario | null,
): ProductoResuelto {
  if (item.talle === null) {
    return {
      fraseOriginal: item.frase,
      talle: null,
      sku: null,
      id_producto: null,
      nombre: null,
      costo: null,
      cantidad,
      encontrado: false,
      motivoError: `Falta el talle para "${item.frase}"`,
    }
  }

  const { entrada, motivoError } = entradaForzada ? { entrada: entradaForzada, motivoError: undefined } : buscarEnDiccionario(item.frase, diccionario)

  if (!entrada) {
    return {
      fraseOriginal: item.frase,
      talle: item.talle,
      sku: null,
      id_producto: null,
      nombre: null,
      costo: null,
      cantidad,
      encontrado: false,
      motivoError,
    }
  }

  let skuFinal: string
  if (entrada.sku_base.includes("XX")) {
    skuFinal = entrada.sku_base.replace("XX", String(item.talle))
  } else {
    // Talle ya fijo en el Diccionario (ej. JORDAN-BLANCA-41): si el mensaje
    // pide un talle distinto, no coincide con lo que el Diccionario sabe -
    // se marca para revisar en vez de asumir.
    const talleFijo = entrada.sku_base.match(/(\d{2,3})$/)?.[1]
    if (talleFijo && Number(talleFijo) !== item.talle) {
      return {
        fraseOriginal: item.frase,
        talle: item.talle,
        sku: entrada.sku_base,
        id_producto: null,
        nombre: null,
        costo: null,
        cantidad,
        encontrado: false,
        motivoError: `"${item.frase}" en el Diccionario tiene talle fijo ${talleFijo}, pero el mensaje pide ${item.talle} - revisar`,
      }
    }
    skuFinal = entrada.sku_base
  }

  const producto = productosPorSku.get(skuFinal.toLowerCase())
  if (!producto) {
    return {
      fraseOriginal: item.frase,
      talle: item.talle,
      sku: skuFinal,
      id_producto: null,
      nombre: null,
      costo: null,
      cantidad,
      encontrado: false,
      motivoError: `SKU no encontrado en el catálogo: ${skuFinal}`,
    }
  }

  return {
    fraseOriginal: item.frase,
    talle: item.talle,
    sku: skuFinal,
    id_producto: producto.id_producto,
    nombre: producto.nombre,
    costo: producto.costo,
    cantidad,
    encontrado: true,
  }
}

// ---------- Ventas + Cambios ----------

type PedidoCrudoVenta = { tipo: "venta"; etiqueta: string; importe: number; lineasProducto: string[] }
type PedidoCrudoCambio = {
  tipo: "cambio"
  cliente: string
  importe: number
  paresLineas: { devuelve: string; entrega: string }[]
}

function segmentarVentas(texto: string): (PedidoCrudoVenta | PedidoCrudoCambio)[] {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const pedidos: (PedidoCrudoVenta | PedidoCrudoCambio)[] = []
  let actual: PedidoCrudoVenta | PedidoCrudoCambio | null = null
  let devuelvePendiente: string[] | null = null

  const headerRegex = /^(.*?)\$\s*([\d.,]+)\s*$/
  const esCambio = (etiqueta: string) => /\(cambio\)/i.test(etiqueta)

  for (const linea of lineas) {
    const headerMatch = linea.match(headerRegex)
    if (headerMatch) {
      const etiqueta = headerMatch[1].trim()
      const importe = parsearMonto(headerMatch[2])

      if (esCambio(etiqueta)) {
        const cliente = etiqueta.replace(/\(cambio\)/i, "").trim()
        actual = { tipo: "cambio", cliente, importe, paresLineas: [] }
      } else {
        actual = { tipo: "venta", etiqueta, importe, lineasProducto: [] }
      }
      pedidos.push(actual)
      devuelvePendiente = null
      continue
    }

    if (!actual) continue

    if (actual.tipo === "cambio") {
      const pedidoCambio = actual
      const devuelveMatch = linea.match(/^devuelve\s*[:;]\s*(.+)$/i)
      const entregaMatch = linea.match(/^le\s+enviamos\s*[:;]\s*(.+)$/i)

      if (devuelveMatch) {
        devuelvePendiente = devuelveMatch[1].split("/").map((s) => s.trim())
      } else if (entregaMatch && devuelvePendiente) {
        const entregas = entregaMatch[1].split("/").map((s) => s.trim())
        entregas.forEach((entrega, i) => {
          const devuelve = devuelvePendiente![i] ?? devuelvePendiente![0]
          pedidoCambio.paresLineas.push({ devuelve, entrega })
        })
        devuelvePendiente = null
      }
    } else {
      actual.lineasProducto.push(linea)
    }
  }

  return pedidos
}

async function cargarDiccionarioYProductos() {
  const [diccionarioRows, productosRows] = await Promise.all([
    sql`SELECT frase, sku_base, marca, modelo FROM diccionario_productos`,
    sql`SELECT id_producto, codigo_sku, descripcion, costo FROM productos WHERE activo = true`,
  ])

  const diccionario = diccionarioRows as unknown as EntradaDiccionario[]
  const productosDb = productosRows as unknown as { id_producto: number; codigo_sku: string; descripcion: string; costo: number }[]

  const productosPorSku = new Map(
    productosDb.map((p) => [p.codigo_sku.toLowerCase(), { id_producto: p.id_producto, nombre: p.descripcion, costo: Number(p.costo) }]),
  )

  return { diccionario, productosPorSku }
}

export async function interpretarVentas(texto: string, fecha: string): Promise<(PedidoVentaResuelto | PedidoCambioResuelto)[]> {
  const { diccionario, productosPorSku } = await cargarDiccionarioYProductos()

  const fechaCompacta = fecha.replace(/-/g, "")
  const crudos = segmentarVentas(texto)
  const resultado: (PedidoVentaResuelto | PedidoCambioResuelto)[] = []

  crudos.forEach((pedido, index) => {
    const numeroPedido = `${fechaCompacta}-${index + 1}`

    if (pedido.tipo === "venta") {
      const productos = pedido.lineasProducto.map((linea) => {
        const parsed = parseProductoLinea(linea)
        // Una línea puede pedir varios talles (rango) o varias unidades (xN):
        // generamos una línea resuelta por unidad, igual que especifica el
        // prompt original.
        const items: ProductoResuelto[] = []
        const talles = parsed.talles.length > 0 ? parsed.talles : [null as unknown as number]
        for (const talle of talles) {
          for (let i = 0; i < parsed.cantidadPorTalle; i++) {
            items.push(resolverProducto({ frase: parsed.frase, talle }, diccionario, productosPorSku, 1))
          }
        }
        return items
      })

      const productosFlat = productos.flat()
      const errores = productosFlat.filter((p) => !p.encontrado).map((p) => p.motivoError || `Error en ${p.fraseOriginal}`)
      if (productosFlat.length === 0) errores.push("El pedido no tiene productos")

      resultado.push({
        tipo: "venta",
        numeroPedido,
        fecha,
        cliente: pedido.etiqueta,
        importe: pedido.importe,
        medioPago: "efectivo",
        productos: productosFlat,
        errores,
      })
    } else {
      const pares = pedido.paresLineas.map(({ devuelve, entrega }) => {
        const devuelveParsed = parseProductoLinea(devuelve)
        const devuelveTalle = devuelveParsed.talles[0] ?? null
        const devuelveMatch = buscarEnDiccionario(devuelveParsed.frase, diccionario)
        const recibido = resolverProducto(
          { frase: devuelveParsed.frase, talle: devuelveTalle },
          diccionario,
          productosPorSku,
          1,
          devuelveMatch.entrada,
        )

        const entregaParsed = parseProductoLinea(entrega)
        const entregaTalle = entregaParsed.talles[0] ?? null
        const esLaMisma = normalizar(entregaParsed.frase) === "la misma"

        // "la misma" (mismo modelo que el devuelto, otro talle): reusamos la
        // misma entrada del Diccionario que resolvió el producto devuelto,
        // en vez de volver a buscar la frase "la misma" (que no existe en
        // el Diccionario).
        const entregado = esLaMisma
          ? resolverProducto({ frase: devuelveParsed.frase, talle: entregaTalle }, diccionario, productosPorSku, 1, devuelveMatch.entrada)
          : resolverProducto({ frase: entregaParsed.frase, talle: entregaTalle }, diccionario, productosPorSku, 1)

        return { entregado, recibido }
      })

      const errores = pares
        .flatMap((p) => [p.entregado, p.recibido])
        .filter((p) => !p.encontrado)
        .map((p) => p.motivoError || `Error en ${p.fraseOriginal}`)
      if (pares.length === 0) errores.push("El cambio no tiene pares entrega/devuelve")

      resultado.push({
        tipo: "cambio",
        numeroPedido,
        fecha,
        cliente: pedido.cliente,
        importe: pedido.importe,
        motivo: `Cambio - $${pedido.importe}`,
        pares,
        errores,
      })
    }
  })

  return resultado
}

// ---------- Compras ----------
// Formato (Prompt 2): bloques por proveedor. Una línea que NO tiene forma de
// "producto + talle/cantidad" se interpreta como encabezado de proveedor
// (quita un "COMPRA" inicial si aparece). Si un bloque no tiene proveedor
// propio, hereda el del bloque anterior. Nota: a diferencia de ventas, este
// formato todavía no se probó contra un mensaje real de compra - conviene
// probarlo con un caso real antes de confiar en la interpretación al 100%.

function pareceLineaDeProducto(linea: string): boolean {
  return /\d/.test(linea)
}

// Parseo de una línea de compra: a diferencia de ventas, acá los números
// repetidos al final ("40 40", "43 43 43 43") suman unidades del mismo
// talle, no son un rango. También soporta "(x3)"/"x3" y "40: 3 pares".
function parseLineaCompra(lineaOriginal: string): { frase: string; talleCantidades: { talle: number; cantidad: number }[] } {
  let linea = lineaOriginal.trim()

  let cantidadForzada: number | null = null
  const paresMatch = linea.match(/:?\s*(\d+)\s*pares?\s*$/i)
  if (paresMatch && paresMatch.index !== undefined) {
    cantidadForzada = Number.parseInt(paresMatch[1], 10)
    linea = linea.slice(0, paresMatch.index).trim()
  }

  let multiplicador = 1
  const multMatch = linea.match(/\(?\s*x\s*(\d+)\s*\)?\s*$/i)
  if (multMatch && multMatch.index !== undefined) {
    multiplicador = Number.parseInt(multMatch[1], 10)
    linea = linea.slice(0, multMatch.index).trim()
  }

  const numerosMatch = linea.match(/((?:\d{2,3}\s*)+)$/)
  const talleCantidades: { talle: number; cantidad: number }[] = []
  let frase = linea

  if (numerosMatch && numerosMatch.index !== undefined) {
    frase = linea.slice(0, numerosMatch.index).trim()
    const numeros = numerosMatch[1]
      .trim()
      .split(/\s+/)
      .map((n) => Number.parseInt(n, 10))
    const conteo = new Map<number, number>()
    for (const n of numeros) conteo.set(n, (conteo.get(n) || 0) + 1)
    for (const [talle, ocurrencias] of conteo) {
      talleCantidades.push({ talle, cantidad: ocurrencias * multiplicador * (cantidadForzada || 1) })
    }
  }

  frase = frase.replace(/[/,;:.\-]+$/, "").trim()

  return { frase, talleCantidades }
}

export async function interpretarCompras(texto: string, fecha: string): Promise<PedidoCompraResuelto[]> {
  const { diccionario, productosPorSku } = await cargarDiccionarioYProductos()

  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const bloques: { proveedor: string; lineas: string[] }[] = []
  let proveedorActual = ""

  for (const linea of lineas) {
    if (!pareceLineaDeProducto(linea)) {
      proveedorActual = linea.replace(/^compra\s+/i, "").trim()
      bloques.push({ proveedor: proveedorActual, lineas: [] })
    } else {
      if (bloques.length === 0) bloques.push({ proveedor: proveedorActual, lineas: [] })
      bloques[bloques.length - 1].lineas.push(linea)
    }
  }

  const fechaCompacta = fecha.replace(/-/g, "")

  return bloques
    .filter((b) => b.lineas.length > 0)
    .map((bloque, index) => {
      // Sumar cantidades por SKU final (frase+talle), tolerando "40 40",
      // "40(x3)", "40: 3 pares" y talles repetidos entre líneas.
      const acumulado = new Map<string, { frase: string; talle: number; cantidad: number }>()
      const lineasSinTalle: string[] = []

      for (const linea of bloque.lineas) {
        const { frase, talleCantidades } = parseLineaCompra(linea)

        if (talleCantidades.length === 0) {
          lineasSinTalle.push(linea)
          continue
        }

        for (const { talle, cantidad } of talleCantidades) {
          const clave = `${normalizar(frase)}|${talle}`
          const previo = acumulado.get(clave)
          acumulado.set(clave, {
            frase,
            talle,
            cantidad: (previo?.cantidad || 0) + cantidad,
          })
        }
      }

      const productos = Array.from(acumulado.values()).map(({ frase, talle, cantidad }) =>
        resolverProducto({ frase, talle }, diccionario, productosPorSku, cantidad),
      )

      const errores = [
        ...productos.filter((p) => !p.encontrado).map((p) => p.motivoError || `Error en ${p.fraseOriginal}`),
        ...lineasSinTalle.map((l) => `No se pudo identificar el talle en la línea: "${l}"`),
      ]
      if (!bloque.proveedor) errores.push("Falta el proveedor")
      if (productos.length === 0) errores.push("El pedido no tiene productos")

      return {
        numeroPedido: `${fechaCompacta}-${index + 1}`,
        fecha,
        proveedor: bloque.proveedor,
        medioPago: "efectivo",
        productos,
        errores,
      }
    })
}
