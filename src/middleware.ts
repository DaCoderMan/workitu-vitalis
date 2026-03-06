import { NextResponse } from "next/server";

// Auth disabled — open access for now
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
