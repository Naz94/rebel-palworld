import type {
  NextRequest,
} from "next/server";

import {
  updateSession,
} from "@/lib/supabase/proxy";

export async function proxy(
  request: NextRequest,
) {
  return updateSession(
    request,
  );
}

export const config = {
  matcher: [
    /*
     * Supabase auth should only run on routes
     * that require authenticated account state.
     *
     * Rebel local companion routes are excluded:
     *
     * /world
     * /worlds
     * /api/world-state
     * /api/worlds
     * /api/world-preferences
     */
    "/((?!_next/static|_next/image|favicon.ico|worlds(?:/|$)|world(?:/|$)|api/worlds(?:/|$)|api/world-state(?:/|$)|api/world-preferences(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};