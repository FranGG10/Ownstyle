import Afip from "@afipsdk/afip.js"
import { sql } from "@/lib/db"

// Motor de facturación electrónica contra ARCA (ex AFIP) para ventas ya
// cargadas en Ownstyle. Emite Factura C (emisor Monotributo, no discrimina
// IVA), o Factura A/B (emisor Responsable Inscripto, sí discrimina IVA) según
// la condición fiscal configurada del emisor y la del cliente. A diferencia
// de la integración con Sindic (lib/sindic-stock.ts), esto NO es best-effort:
// si ARCA rechaza la solicitud, la venta queda "sin facturar" y el usuario
// decide si reintentar. Mientras no haya certificado real de producción,
// corre contra el CUIT de pruebas de ARCA (ver ARCA_* en .env.local).

let afipInstance: InstanceType<typeof Afip> | null = null

function getAfipClient() {
  if (afipInstance) return afipInstance

  const CUIT = process.env.ARCA_CUIT
  const access_token = process.env.ARCA_ACCESS_TOKEN

  if (!CUIT || !access_token) {
    throw new Error("ARCA_CUIT o ARCA_ACCESS_TOKEN no están configurados en las variables de entorno")
  }

  afipInstance = new Afip({
    CUIT: Number(CUIT),
    access_token,
    production: process.env.ARCA_PRODUCCION === "true",
    cert: process.env.ARCA_CERT || undefined,
    key: process.env.ARCA_KEY || undefined,
  })

  return afipInstance
}

function normalizarCondicion(condicion?: string | null) {
  return (condicion || "").trim().toLowerCase()
}

// Mapeo a los códigos que espera ARCA para "Condición frente al IVA del receptor"
const CONDICION_IVA_RECEPTOR: Record<string, number> = {
  "responsable inscripto": 1,
  monotributo: 6,
  exento: 4,
  "consumidor final": 5,
}

function condicionIvaReceptorId(condicion?: string | null) {
  return CONDICION_IVA_RECEPTOR[normalizarCondicion(condicion)] || 5
}

function datosReceptor(cliente: { cuit?: string | null; condicion_iva?: string | null }) {
  const cuitDigits = (cliente.cuit || "").replace(/\D/g, "")

  if (cuitDigits.length === 11) {
    return {
      DocTipo: 80,
      DocNro: Number(cuitDigits),
      CondicionIVAReceptorId: condicionIvaReceptorId(cliente.condicion_iva),
    }
  }

  // Consumidor Final sin identificar
  return { DocTipo: 99, DocNro: 0, CondicionIVAReceptorId: 5 }
}

// Mapeo simple de tasas de IVA usuales al Id de alícuota que espera ARCA
const ALICUOTA_IVA: Record<number, number> = {
  0: 3,
  2.5: 9,
  5: 8,
  10.5: 4,
  21: 5,
  27: 6,
}

function idAliquotaSegunTasa(tasaIva: number) {
  return ALICUOTA_IVA[tasaIva] || 5
}

// Decide qué comprobante corresponde y calcula neto/IVA a partir del total
// (precio final ya cobrado):
// - Emisor Monotributo -> Factura C, nunca discrimina IVA.
// - Emisor Responsable Inscripto -> Factura A si el receptor también es
//   Responsable Inscripto (con CUIT), sino Factura B. Ambas discriminan IVA.
function tipoComprobanteYMontos(
  condicionEmisor: string,
  cliente: { cuit?: string | null; condicion_iva?: string | null },
  importeTotal: number,
  tasaIva: number,
) {
  const emisorEsRI = normalizarCondicion(condicionEmisor) === "responsable inscripto"

  if (!emisorEsRI) {
    return { cbteTipo: 11, impNeto: importeTotal, impIva: 0, iva: undefined as { Id: number; BaseImp: number; Importe: number }[] | undefined }
  }

  const cuitDigits = (cliente.cuit || "").replace(/\D/g, "")
  const receptorEsRI = cuitDigits.length === 11 && normalizarCondicion(cliente.condicion_iva) === "responsable inscripto"

  const impNeto = Math.round((importeTotal / (1 + tasaIva / 100)) * 100) / 100
  const impIva = Math.round((importeTotal - impNeto) * 100) / 100

  return {
    cbteTipo: receptorEsRI ? 1 : 6, // 1 = Factura A, 6 = Factura B
    impNeto,
    impIva,
    iva: [{ Id: idAliquotaSegunTasa(tasaIva), BaseImp: impNeto, Importe: impIva }],
  }
}

function fechaHoyArca() {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, "0")
  const dd = String(hoy.getDate()).padStart(2, "0")
  return Number(`${yyyy}${mm}${dd}`)
}

async function getConfig(clave: string, valorDefault: string) {
  const [config] = await sql`SELECT valor FROM configuraciones WHERE clave = ${clave}`
  return config?.valor ?? valorDefault
}

export async function emitirFactura(idMovimiento: number) {
  const [venta] = await sql`
    SELECT m.id_movimiento, m.tipo, m.estado, m.total, c.cuit, c.condicion_iva
    FROM movimientos m
    LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
    WHERE m.id_movimiento = ${idMovimiento}
  `

  if (!venta) {
    return { success: false, error: "La venta no existe" }
  }
  if (venta.tipo !== "venta" || venta.estado !== "completado") {
    return { success: false, error: "Solo se pueden facturar ventas completadas" }
  }

  const [facturaExistente] = await sql`
    SELECT numero_comprobante FROM facturas WHERE id_movimiento = ${idMovimiento}
  `
  if (facturaExistente) {
    return { success: false, error: `Esta venta ya fue facturada (Nº ${facturaExistente.numero_comprobante})` }
  }

  const importeTotal = Number(venta.total)
  const receptor = datosReceptor(venta)

  const umbralConsumidorFinal = Number(await getConfig("umbral_consumidor_final", "1000000"))
  if (receptor.DocTipo === 99 && importeTotal >= umbralConsumidorFinal) {
    return {
      success: false,
      error: `Esta venta es de $${importeTotal.toLocaleString("es-AR")}, supera el umbral de $${umbralConsumidorFinal.toLocaleString("es-AR")} para facturar sin identificar al comprador. Cargá el CUIT/DNI del cliente antes de facturar.`,
    }
  }

  const puntoVenta = Number(process.env.ARCA_PUNTO_VENTA || "1")
  const condicionEmisor = await getConfig("empresa_condicion_iva", "Monotributo")
  const tasaIva = Number(await getConfig("iva_tasa", "21"))
  const { cbteTipo, impNeto, impIva, iva } = tipoComprobanteYMontos(condicionEmisor, venta, importeTotal, tasaIva)

  try {
    const afip = getAfipClient()

    const resultado = await afip.ElectronicBilling.createNextVoucher({
      PtoVta: puntoVenta,
      CbteTipo: cbteTipo,
      Concepto: 1, // Productos
      DocTipo: receptor.DocTipo,
      DocNro: receptor.DocNro,
      CbteFch: fechaHoyArca(),
      ImpTotal: importeTotal,
      ImpTotConc: 0,
      ImpNeto: impNeto,
      ImpOpEx: 0,
      ImpIVA: impIva,
      ImpTrib: 0,
      MonId: "PES",
      MonCotiz: 1,
      CondicionIVAReceptorId: receptor.CondicionIVAReceptorId,
      ...(iva ? { Iva: iva } : {}),
    })

    await sql`
      INSERT INTO facturas (
        id_movimiento, tipo_comprobante, punto_venta, numero_comprobante,
        cae, cae_vencimiento, doc_tipo, doc_nro, importe_total, imp_neto, imp_iva
      )
      VALUES (
        ${idMovimiento}, ${cbteTipo}, ${puntoVenta}, ${resultado.voucherNumber},
        ${resultado.CAE}, ${resultado.CAEFchVto}, ${receptor.DocTipo}, ${String(receptor.DocNro)},
        ${importeTotal}, ${impNeto}, ${impIva}
      )
    `

    return {
      success: true,
      cae: resultado.CAE,
      vencimiento: resultado.CAEFchVto,
      numero: resultado.voucherNumber,
      puntoVenta,
      tipoComprobante: cbteTipo,
    }
  } catch (error: any) {
    console.error("[v0] Error al facturar venta", idMovimiento, "en ARCA:", error)
    return { success: false, error: error.message || "Error al emitir la factura en ARCA" }
  }
}
