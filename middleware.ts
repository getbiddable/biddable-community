import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - require authentication
  const protectedRoutes = ["/", "/campaigns", "/audiences", "/assets", "/reporting"]
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + "/")
  )

  // Public routes - redirect to dashboard if already logged in
  const publicRoutes = ["/login", "/signup"]
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    // Redirect to login if trying to access protected route without auth
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isPublicRoute && user) {
    // Redirect to dashboard if already logged in and trying to access login/signup
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
