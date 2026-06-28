import { NextResponse } from 'next/server';
import { RbacError } from './rbac';
import { UnauthenticatedError } from './auth';

// RFC-7807 application/problem+json (API_CONTRACT global rules).
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export function problem(status: number, title: string, detail?: string): NextResponse {
  const body: Problem = { type: 'about:blank', title, status, detail };
  return NextResponse.json(body, {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });
}

// Maps thrown domain errors to the correct problem+json response.
export function handleError(err: unknown): NextResponse {
  if (err instanceof RbacError) {
    return problem(403, 'Forbidden', err.message);
  }
  if (err instanceof UnauthenticatedError) {
    return problem(401, 'Unauthenticated', err.message);
  }
  console.error('[api] unhandled error', err);
  return problem(500, 'Internal Server Error', err instanceof Error ? err.message : undefined);
}
