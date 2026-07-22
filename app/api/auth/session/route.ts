import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("ownstyle_session")

    if (!session) {
      return NextResponse.json({ authenticated: false })
    }

    const userData = JSON.parse(session.value)
    return NextResponse.json({
      authenticated: true,
      user: userData,
    })
  } catch (error) {
    console.error("Error al verificar sesión:", error)
    return NextResponse.json({ authenticated: false })
  }
}
