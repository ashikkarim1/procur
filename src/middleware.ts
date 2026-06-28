import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/copilot/PR-2291',
];

// API routes that allow public/guest access
const PUBLIC_API_ROUTES = [
  '/api/billing/webhook', // Stripe webhooks use signature verification, not auth
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Require auth for all /api/* routes
  if (pathname.startsWith('/api/')) {
    const actor = req.headers.get('x-actor-id') || req.cookies.get('procur_actor')?.value;
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Allow authenticated users to access workspace routes
  if (pathname.startsWith('/(workspace)') || pathname.startsWith('/settings') || pathname.startsWith('/copilot') || pathname.startsWith('/negotiations') || pathname.startsWith('/implementation') || pathname.startsWith('/vendors')) {
    const actor = req.headers.get('x-actor-id') || req.cookies.get('procur_actor')?.value;
    if (!actor) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
