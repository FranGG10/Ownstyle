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
  talle: string | null // numérico ("38") o de ropa ("M", "XL")
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
  talles: string[]
  cantidadPorTalle: number
}

// Talles de ropa (Baggy, Joggin, Buzo): no son numéricos como el calzado.
const TALLES_ROPA = ["XXXL", "XXL", "XL", "L", "M", "S", "XS"]
const TALLE_ROPA_REGEX = new RegExp(`\\b(${TALLES_ROPA.join("|")})\\s*$`, "i")

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

  let talles: string[] = []
  let frase = linea

  const rangoMatch = linea.match(/(\d{2,3}(?:\s*-\s*\d{2,3})+)\s*$/)
  const talleRopaMatch = linea.match(TALLE_ROPA_REGEX)

  if (rangoMatch && rangoMatch.index !== undefined) {
    const numeros = rangoMatch[1].split("-").map((n) => Number.parseInt(n.trim(), 10))
    frase = linea.slice(0, rangoMatch.index).trim()
    if (numeros.length === 2 && numeros[1] > numeros[0] && numeros[1] - numeros[0] <= 15) {
      for (let t = numeros[0]; t <= numeros[1]; t++) talles.push(String(t))
    } else {
      talles = numeros.map(String)
    }
  } else {
    const talleMatch = linea.match(/(\d{2,3})\s*$/)
    if (talleMatch && talleMatch.index !== undefined) {
      talles = [talleMatch[1]]
      frase = linea.slice(0, talleMatch.index).trim()
    } else if (talleRopaMatch && talleRopaMatch.index !== undefined) {
      // Talle de ropa (M, L, XL, XXL...) en vez de un número.
      talles = [talleRopaMatch[1].toUpperCase()]
      frase = linea.slice(0, talleRopaMatch.index).trim()
    }
  }

  frase = frase.replace(/[/,;:.\-]+$/, "").trim()

  return { frase, talles, cantidadPorTalle }
}

function parsearMonto(raw: string): number {
  return Number.parseInt(raw.replace(/\./g, "").replace(",", "").trim(), 10) || 0
}

// Los mensajes a veces se pegan tal cual salen de un export de WhatsApp:
// "[11:17 a. m., 28/7/2026] Emi Cliente: COMPRA ROBIN". Si una línea tiene
// ese formato, se saca el encabezado y se usa la fecha real del mensaje en
// vez de la fecha elegida a mano en el formulario.
function extraerFechaWhatsapp(lineaOriginal: string): { fecha: string | null; contenido: string } {
  const match = lineaOriginal.match(/^\[([^\]]+)\]\s*[^:]*:\s*(.*)$/)
  if (!match) return { fecha: null, contenido: lineaOriginal }

  const fechaMatch = match[1].match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  const fecha = fechaMatch ? `${fechaMatch[3]}-${fechaMatch[2].padStart(2, "0")}-${fechaMatch[1].padStart(2, "0")}` : null

  return { fecha, contenido: match[2].trim() }
}

// ---------- Resolución de un ítem contra Diccionario + catálogo real ----------

function resolverProducto(
  item: { frase: string; talle: string | null },
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
    skuFinal = entrada.sku_base.replace("XX", item.talle)
  } else {
    // Talle ya fijo en el Diccionario (ej. JORDAN-BLANCA-41): si el mensaje
    // pide un talle distinto, no coincide con lo que el Diccionario sabe -
    // se marca para revisar en vez de asumir.
    const talleFijo = entrada.sku_base.match(/(\d{2,3})$/)?.[1]
    if (talleFijo && talleFijo !== item.talle) {
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

type PedidoCrudoVenta = { tipo: "venta"; etiqueta: string; importe: number; fecha: string; lineasProducto: string[] }
type PedidoCrudoCambio = {
  tipo: "cambio"
  cliente: string
  importe: number
  fecha: string
  paresLineas: { devuelve: string; entrega: string }[]
}

function segmentarVentas(texto: string, fechaDefault: string): (PedidoCrudoVenta | PedidoCrudoCambio)[] {
  const lineasCrudas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const pedidos: (PedidoCrudoVenta | PedidoCrudoCambio)[] = []
  let actual: PedidoCrudoVenta | PedidoCrudoCambio | null = null
  let devuelvePendiente: string[] | null = null
  let fechaActual = fechaDefault

  const headerRegex = /^(.*?)\$\s*([\d.,]+)\s*$/
  const esCambio = (etiqueta: string) => /\(cambio\)/i.test(etiqueta)

  for (const lineaCruda of lineasCrudas) {
    const { fecha: fechaMsj, contenido } = extraerFechaWhatsapp(lineaCruda)
    if (fechaMsj) fechaActual = fechaMsj
    const linea = contenido.trim()
    if (!linea) continue

    const headerMatch = linea.match(headerRegex)
    if (headerMatch) {
      const etiqueta = headerMatch[1].trim()
      const importe = parsearMonto(headerMatch[2])

      if (esCambio(etiqueta)) {
        const cliente = etiqueta.replace(/\(cambio\)/i, "").trim()
        actual = { tipo: "cambio", cliente, importe, fecha: fechaActual, paresLineas: [] }
      } else {
        actual = { tipo: "venta", etiqueta, importe, fecha: fechaActual, lineasProducto: [] }
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

export async function interpretarVentas(texto: string, fechaDefault: string): Promise<(PedidoVentaResuelto | PedidoCambioResuelto)[]> {
  const { diccionario, productosPorSku } = await cargarDiccionarioYProductos()

  const crudos = segmentarVentas(texto, fechaDefault)
  const resultado: (PedidoVentaResuelto | PedidoCambioResuelto)[] = []
  const contadorPorFecha = new Map<string, number>()

  // El número de pedido es correlativo por día (arranca en 1 cada fecha
  // distinta que aparezca en el texto, ej. si hay timestamps de WhatsApp de
  // más de un día en el mismo pegado).
  const siguienteNumeroPedido = (fechaPedido: string) => {
    const n = (contadorPorFecha.get(fechaPedido) || 0) + 1
    contadorPorFecha.set(fechaPedido, n)
    return `${fechaPedido.replace(/-/g, "")}-${n}`
  }

  crudos.forEach((pedido) => {
    const numeroPedido = siguienteNumeroPedido(pedido.fecha)
    const fecha = pedido.fecha

    if (pedido.tipo === "venta") {
      const productos = pedido.lineasProducto.map((linea) => {
        const parsed = parseProductoLinea(linea)
        // Una línea puede pedir varios talles (rango) o varias unidades (xN):
        // generamos una línea resuelta por unidad, igual que especifica el
        // prompt original.
        const items: ProductoResuelto[] = []
        const talles: (string | null)[] = parsed.talles.length > 0 ? parsed.talles : [null]
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
// Se vieron 3 formatos reales distintos y el parser soporta los 3:
//   1) "COMPRA MAGDA" + "MQ BCO 40 40" + "MQ NE 41(x3)" (frase y talles en
//      la misma línea, con o sin "(xN)"/"xN").
//   2) Export de WhatsApp con timestamp: "[11:17 a. m., 28/7/2026] Emi
//      Cliente: JORDAN BOTA" (encabezado de modelo, SIN talles) seguido de
//      líneas que son solo números repetidos ("36 36 36", "43 43 43 43 43
//      43 43") - esos talles pertenecen al último modelo nombrado. La fecha
//      real del mensaje reemplaza a la fecha elegida a mano si está presente.
//   3) "Campus blancas: 35 (x2), 36 (x3), ..., 45" (modelo + ":" + lista de
//      talles separados por coma, cada uno con "(xN)" opcional - sin
//      multiplicador cuenta como 1).
// En los 3 casos, el proveedor se identifica solo con una línea que empiece
// con la palabra "compra" (ej. "COMPRA ROBIN", "Compra Carla") - cualquier
// otra línea sin talles es un encabezado de modelo, no un proveedor nuevo.

// Extrae talle+cantidad de una lista tipo "35 (x2), 36 (x3), 45" o de talles
// sueltos repetidos "36 36 36" (sin "(xN)" cuenta 1 por aparición).
function extraerTallesConCantidad(texto: string): { talle: number; cantidad: number }[] {
  const limpio = texto.replace(/,/g, " ")
  const regex = /(\d{2,3})\s*(?:\(?\s*x\s*(\d+)\s*\)?)?/gi
  const resultado: { talle: number; cantidad: number }[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(limpio)) !== null) {
    resultado.push({ talle: Number.parseInt(match[1], 10), cantidad: match[2] ? Number.parseInt(match[2], 10) : 1 })
  }
  return resultado
}

// Parsea una línea de compra. Devuelve `frase` vacía cuando la línea es solo
// talles (formato 2, hereda el modelo de la línea anterior en el llamador).
function parseLineaCompra(lineaOriginal: string): { frase: string; talleCantidades: { talle: number; cantidad: number }[] } {
  const linea = lineaOriginal.trim()

  const colonIndex = linea.indexOf(":")
  if (colonIndex !== -1) {
    const antes = linea.slice(0, colonIndex).trim()
    const despues = linea.slice(colonIndex + 1).trim()

    if (/^\d{2,3}$/.test(antes)) {
      // "40: 3 pares" - lo de antes del ":" es el talle, no un producto
      const cantidadMatch = despues.match(/(\d+)/)
      const cantidad = cantidadMatch ? Number.parseInt(cantidadMatch[1], 10) : 1
      return { frase: "", talleCantidades: [{ talle: Number.parseInt(antes, 10), cantidad }] }
    }

    // "Campus blancas: 35 (x2), 36 (x3), ..." - modelo + lista de talles
    return { frase: antes, talleCantidades: extraerTallesConCantidad(despues) }
  }

  // Sin ":". Separar la frase de la "cola" de números al final de la línea
  // (soporta "MQ BCO 40 40", "MQ NE 41(x3)", o una línea que es solo
  // talles "36 36 36" -> frase queda vacía).
  const numerosMatch = linea.match(/((?:\d{2,3}\s*(?:\(?\s*x\s*\d+\s*\)?)?[\s,]*)+)$/i)
  if (!numerosMatch || numerosMatch.index === undefined) {
    return { frase: linea, talleCantidades: [] }
  }

  const frase = linea
    .slice(0, numerosMatch.index)
    .trim()
    .replace(/[/,;:.\-]+$/, "")
    .trim()

  return { frase, talleCantidades: extraerTallesConCantidad(numerosMatch[1]) }
}

export async function interpretarCompras(texto: string, fechaDefault: string): Promise<PedidoCompraResuelto[]> {
  const { diccionario, productosPorSku } = await cargarDiccionarioYProductos()

  const lineasCrudas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  interface Bloque {
    proveedor: string
    fecha: string
    acumulado: Map<string, { frase: string; talle: number; cantidad: number }>
    lineasSinTalle: string[]
  }

  const bloques: Bloque[] = []
  let bloqueActual: Bloque | null = null
  let modeloActual = ""
  let fechaActual = fechaDefault

  const nuevoBloque = (proveedor: string): Bloque => {
    const b: Bloque = { proveedor, fecha: fechaActual, acumulado: new Map(), lineasSinTalle: [] }
    bloques.push(b)
    return b
  }

  for (const lineaCruda of lineasCrudas) {
    const { fecha: fechaMsj, contenido } = extraerFechaWhatsapp(lineaCruda)
    if (fechaMsj) fechaActual = fechaMsj
    const linea = contenido.trim()
    if (!linea) continue

    const proveedorMatch = linea.match(/^compra\s+(.+)$/i)
    if (proveedorMatch) {
      bloqueActual = nuevoBloque(proveedorMatch[1].trim())
      modeloActual = ""
      continue
    }

    if (!bloqueActual) bloqueActual = nuevoBloque("")

    const { frase, talleCantidades } = parseLineaCompra(linea)

    if (talleCantidades.length > 0) {
      const fraseFinal = frase || modeloActual
      if (!fraseFinal) {
        bloqueActual.lineasSinTalle.push(`Talles sin producto: "${linea}"`)
        continue
      }
      for (const { talle, cantidad } of talleCantidades) {
        const clave = `${normalizar(fraseFinal)}|${talle}`
        const previo = bloqueActual.acumulado.get(clave)
        bloqueActual.acumulado.set(clave, { frase: fraseFinal, talle, cantidad: (previo?.cantidad || 0) + cantidad })
      }
      continue
    }

    if (!/\d/.test(linea)) {
      // Línea de puro texto: nombre de modelo, los talles vienen en las
      // líneas siguientes.
      modeloActual = linea
    } else {
      bloqueActual.lineasSinTalle.push(`No se pudo interpretar la línea: "${linea}"`)
    }
  }

  const contadorPorFecha = new Map<string, number>()
  const siguienteNumeroPedido = (fechaPedido: string) => {
    const n = (contadorPorFecha.get(fechaPedido) || 0) + 1
    contadorPorFecha.set(fechaPedido, n)
    return `${fechaPedido.replace(/-/g, "")}-${n}`
  }

  return bloques
    .filter((b) => b.acumulado.size > 0 || b.lineasSinTalle.length > 0)
    .map((bloque) => {
      const productos = Array.from(bloque.acumulado.values()).map(({ frase, talle, cantidad }) =>
        resolverProducto({ frase, talle: String(talle) }, diccionario, productosPorSku, cantidad),
      )

      const errores = [
        ...productos.filter((p) => !p.encontrado).map((p) => p.motivoError || `Error en ${p.fraseOriginal}`),
        ...bloque.lineasSinTalle,
      ]
      if (!bloque.proveedor) errores.push("Falta el proveedor")
      if (productos.length === 0) errores.push("El pedido no tiene productos")

      return {
        numeroPedido: siguienteNumeroPedido(bloque.fecha),
        fecha: bloque.fecha,
        proveedor: bloque.proveedor,
        medioPago: "efectivo",
        productos,
        errores,
      }
    })
}
