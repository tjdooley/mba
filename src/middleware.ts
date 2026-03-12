import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow the login page through
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  const token = request.cookies.get('mba_admin')?.value
  const secret = process.env.ADMIN_PASSWORD

  if (!secret || token !== secret) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
