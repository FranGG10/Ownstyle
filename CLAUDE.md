# Ownstyle

Sistema de stock y contabilidad para la tienda física de indumentaria ("Ropa") de
Francisco. Es un proyecto separado de **Sindic** (el sistema contable de la tienda online
DAEC indumentaria en Tiendanube), pero ambos sistemas están integrados: cuando acá se
vende o se cambia una prenda de categoría "Ropa", Ownstyle le avisa a Sindic para que
descuente/reponga su propio stock real. Ninguno de los dos sistemas comparte base de
datos — la integración es 100% por HTTP.

## Stack

- Next.js (App Router) + TypeScript.
- **SQL crudo** vía `@neondatabase/serverless` — a diferencia de Sindic, acá NO hay
  Prisma ni un ORM. Las queries están escritas a mano en los `app/actions/*.ts` y
  `app/api/**/route.ts`.
- Base de datos: Neon Postgres (proyecto propio, separado del de Sindic).
- Deploy: Vercel, proyecto `v0-stock-and-accounting-system`
  (`frangesto10-4362s-projects/v0-stock-and-accounting-system`).
  Producción: https://v0-stock-and-accounting-system.vercel.app
- Es un proyecto originado en **v0.app** (por eso el histórico de branches
  `v0/frangesto10-...`).

## Deploy — particularidad importante de v0.app

Este proyecto se creó en v0.app, así que a primera vista parece que solo se puede
promover a producción con el botón "Publish" de v0. **Esto NO es así**: una vez que
existe una rama `main` en el remoto y coincide con la `productionBranch` configurada en
Vercel, un `git push` directo a `origin/main` SÍ dispara un deploy real a producción
(confirmado vía API de Vercel: el deployment resultante tiene `source: "git"` y
`target: "production"`).

La rama local que se usa para trabajar acá es **`main-deploy`**, que trackea
`origin/main` (`git push origin main-deploy:main` o, si `main-deploy` ya tiene upstream
configurado a `origin/main`, un `git push` común alcanza). Este repo ya viene con esa
rama creada y trackeada correctamente — no hace falta reconfigurar nada, solo:

```bash
git checkout main-deploy
# hacer cambios, commit
git push origin main-deploy:main
```

## Variables de entorno

Ya están bajadas a `.env.local` (vía `vercel env pull --environment=production`), pulled
directo de Vercel — no hace falta pedirle credenciales a Francisco para desarrollo local.
Las relevantes para la integración con Sindic:

- `SINDIC_API_URL` — URL base de Sindic (`https://sistema-contable-beta-eight.vercel.app`
  o el alias `https://sistema-contable-frangesto10-4362s-projects.vercel.app`).
- `SINDIC_API_KEY` — clave que Sindic valida contra su propia env var
  `EXTERNAL_STOCK_API_KEY`, para los endpoints de consumo/reposición de stock.
- `SINDIC_REPORTS_API_KEY` — clave que Sindic usa para leer los reportes de Ownstyle
  desde su módulo "Consolidado" (ver más abajo). Ojo: es una clave DISTINTA de
  `SINDIC_API_KEY` — no confundir una con otra (pasó en esta sesión).

Si en algún momento `vercel env pull` no trae estas variables actualizadas, es porque
cambiaron del lado de Vercel — hay que volver a pullear, no hardcodearlas.

## Integración con Sindic

### 1. Ownstyle → Sindic: descuento/reposición de stock real

Cuando se vende o se cambia una prenda de categoría **"Ropa"** en Ownstyle, hay que
avisarle a Sindic para que descuente (o reponga) el stock real de esa prenda allá.
Sindic es quien lleva el stock físico verdadero de la mercadería compartida entre ambos
canales de venta.

Helper compartido: `lib/sindic-stock.ts`
- `notificarConsumoStockSindic({ modelo, color, talla, quantity, reference })` → POST
  `${SINDIC_API_URL}/api/stock/consumo-externo` con header `x-api-key: SINDIC_API_KEY`.
- `notificarReposicionStockSindic({...})` → mismo patrón, POST a
  `${SINDIC_API_URL}/api/stock/reposicion-externa`.
- Si Sindic no responde o tira error, **no hay que frenar la operación en Ownstyle** —
  se loguea el error (`console.error("[v0] ...")`) y la venta/cambio queda igual
  registrado acá. Es un aviso best-effort, no una transacción atómica entre sistemas.
- Ninguna de las dos llamadas genera asiento contable en Sindic — solo mueven stock.

**Todos los lugares que venden o mueven una prenda "Ropa" tienen que llamar a estos
helpers.** Ya están cableados en:
- `app/actions/ventas.ts` (`createVenta`, carga de venta individual).
- `app/api/ventas/carga-masiva/route.ts` (carga masiva de ventas — este endpoint tenía
  un gap real: nunca llamaba al helper, se detectó y parchó en la sesión donde se armó
  esta integración).
- `app/actions/cambios.ts` (`createCambio`, `completarCambio`, `eliminarCambio` — un
  cambio de talle/color de Ropa entrega una prenda y potencialmente devuelve otra).

**Si agregás un nuevo flujo que vende, carga en bulk, o mueve stock de una prenda
"Ropa" (nueva forma de carga, importación, ajuste manual, etc.), tiene que llamar a
`notificarConsumoStockSindic`/`notificarReposicionStockSindic` también** — si no, el
stock de Sindic queda desincronizado silenciosamente (ya pasó dos veces: carga masiva y
cambios, ambos se encontraron por auditoría manual, no por error visible).

### 2. Sindic → Ownstyle: reportes para el módulo "Consolidado"

Sindic tiene un módulo que combina el Estado de Resultados y el Balance de ambos
sistemas. Para eso, Ownstyle expone dos endpoints de solo lectura que Sindic consume:

- `GET /api/reportes/estado-resultados` — `app/api/reportes/estado-resultados/route.ts`
- `GET /api/reportes/balance` — `app/api/reportes/balance/route.ts`

Ambos están guardados detrás de `SINDIC_REPORTS_API_KEY` (header, mismo patrón que la
integración de stock). Estos NO reciben nada de Sindic, solo devuelven datos propios.

**Nota de un bug ya resuelto**: estos endpoints originalmente filtraban por una columna
`plan_cuentas.es_imputable` que no existe en la tabla real — el badge "Imputable" que se
ve en la UI de Ownstyle se calcula del lado del cliente (`nivel === 3`), no es una
columna de la base. Se sacó ese filtro; el JOIN con `asientos_detalle` ya excluye
naturalmente las cuentas no-hoja. Si tocás estos endpoints y ves este patrón en otro
lado, es el mismo problema.

## Facturación electrónica (Factura A/B/C / ARCA)

Ownstyle puede emitir facturas electrónicas contra ARCA (ex AFIP) para las
ventas ya cargadas. Es **manual**: el usuario elige qué ventas facturar desde
el listado (`/ventas`, checkboxes + "Facturar seleccionadas" — una Factura
independiente por cada venta tildada) o desde el detalle de una venta
(`/ventas/detalle/[id]`, botón "Facturar"). No hay facturación automática al
crear la venta.

Librería: `@afipsdk/afip.js`. Toda la lógica vive en
[lib/arca-facturacion.ts](lib/arca-facturacion.ts) (`emitirFactura`), llamada
desde los server actions en [app/actions/facturacion.ts](app/actions/facturacion.ts)
(`facturarVenta`, `facturarVentasLote`).

**Qué tipo de comprobante emite** (función `tipoComprobanteYMontos` en
`lib/arca-facturacion.ts`), según la config `empresa_condicion_iva`
(editable en `/configuracion`, card "Datos de la Empresa"):
- Emisor **Monotributo** → siempre **Factura C** (CbteTipo 11), sin
  discriminar IVA.
- Emisor **Responsable Inscripto** → **Factura A** (CbteTipo 1) si el cliente
  también es Responsable Inscripto con CUIT cargado, sino **Factura B**
  (CbteTipo 6). Ambas discriminan IVA usando la tasa de `configuraciones.iva_tasa`
  (default 21%).

Config `umbral_consumidor_final` (default `1000000`, editable en
`/configuracion`): por debajo de ese monto se puede facturar a Consumidor
Final sin CUIT/DNI cargado; por encima, `emitirFactura` rechaza la operación
pidiendo cargar el CUIT/DNI del cliente antes de facturar (sin llamar a ARCA).

Variables de entorno (mismo patrón que `SINDIC_*`):
- `ARCA_CUIT` — CUIT contra el que se factura.
- `ARCA_ACCESS_TOKEN` — token gratuito de afipsdk.com. **Pendiente**: hay que
  crear una cuenta gratis ahí para poder emitir CAEs, incluso en homologación.
- `ARCA_PUNTO_VENTA` — punto de venta.
- `ARCA_CERT` / `ARCA_KEY` — contenido PEM del certificado/clave. Vacíos =
  modo homologación (CUIT de pruebas 20409378472, sin certificado).
- `ARCA_PRODUCCION` — `"true"` para pasar a producción real.

**Estado real (2026-07-31): PRODUCCIÓN ACTIVA.** `ARCA_PRODUCCION="true"` en
`.env.local` y en Vercel (Production). El sistema factura contra el CUIT real
de la clienta (Daniela Angel Medone, 27-44262623-0), Punto de Venta **3**
(el 1 y 2 no están habilitados para Web Services, solo el 3 — verificado
contra ARCA con `getSalesPoints()` antes de activar). Certificado/clave en
`certs/arca/` (gitignoreado, nunca se sube al repo — ver `.gitignore`) y
también cargados como `ARCA_CERT`/`ARCA_KEY` en Vercel. **A partir de acá,
cualquier "Facturar" en la app emite una Factura fiscal real e irreversible.**

Tabla `facturas` (`scripts/008-facturacion-arca.sql` + `010-facturas-desglose-iva.sql`):
una fila por venta efectivamente facturada (CAE real), con `tipo_comprobante`
(1/6/11) e `imp_neto`/`imp_iva` ya calculados. `id_movimiento` es `UNIQUE` —
evita doble facturación de la misma venta a nivel DB. Los intentos fallidos
no se guardan, se muestran como error en el momento.

`deleteVenta` (`app/actions/ventas.ts`) rechaza borrar una venta si ya tiene
una fila en `facturas` — una vez que ARCA emitió el CAE, no se puede
"des-emitir" borrando el registro local.

Reporte: pestaña "Facturación" en `/informes` (`app/api/informes/facturacion/route.ts`)
lista todas las ventas facturadas en un rango de fechas con sus datos de
factura (CAE, tipo, neto/IVA/total) y un link al detalle de cada venta.

Pendiente / fuera de alcance por ahora: PDF/QR del comprobante, modo
automático al crear la venta, notas de crédito/débito, recibos.

## Cómo levantar el proyecto

```bash
npm install --legacy-peer-deps   # el repo trae pnpm-lock.yaml pero se instaló con npm sin problemas
npm run dev                      # puerto 3000
```

`.env.local` ya tiene las variables de producción pulleadas. Si hace falta refrescarlas:

```bash
vercel env pull .env.local --environment=production --yes
```

## Contexto de negocio

Francisco tiene dos canales de venta de la misma indumentaria: la tienda online (DAEC
indumentaria, en Tiendanube, gestionada contablemente por Sindic) y la tienda física
(gestionada acá, en Ownstyle). El stock físico de mercadería (buzos, remeras, baggys,
joggins) es el mismo pool para ambos canales — por eso la integración de stock entre los
dos sistemas es crítica: si alguien compra en el local, tiene que reflejarse en el stock
que ve Sindic para no vender de más online, y viceversa.
