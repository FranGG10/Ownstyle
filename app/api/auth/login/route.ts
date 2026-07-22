import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { usuario, password } = await request.json()

    if (!usuario || !password) {
      return NextResponse.json({ success: false, error: "Usuario y contraseña son requeridos" }, { status: 400 })
    }

    // Buscar usuario en la base de datos
    const usuarios = await sql`
      SELECT id, usuario, password_hash, nombre_completo 
      FROM usuarios_sistema 
      WHERE usuario = ${usuario} AND activo = true
    `

    if (usuarios.length === 0) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 401 })
    }

    const user = usuarios[0]

    // Verificar contraseña (comparación simple - en producción usar bcrypt)
    if (user.password_hash !== password) {
      return NextResponse.json({ success: false, error: "Contraseña incorrecta" }, { status: 401 })
    }

    // Crear sesión (cookie simple - en producción usar JWT o similar)
    const sessionData = JSON.stringify({
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre_completo,
      loginAt: new Date().toISOString(),
    })

    // Guardar cookie de sesión
    const cookieStore = await cookies()
    cookieStore.set("ownstyle_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre_completo,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json({ success: false, error: "Error del servidor" }, { status: 500 })
  }
}
