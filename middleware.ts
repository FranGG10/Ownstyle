import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const session = request.cookies.get("ownstyle_session")
  const { pathname } = request.nextUrl

  // Las APIs internas no necesitan verificación de sesión aquí ya que son llamadas desde el cliente autenticado
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Rutas públicas que no requieren autenticación
  const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/session"]
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // Si es una ruta pública, permitir acceso
  if (isPublicPath) {
    // Si ya está autenticado y trata de ir al login, redirigir al dashboard
    if (pathname === "/login" && session) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // Si no hay sesión y no es ruta pública, redirigir al login
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
}
