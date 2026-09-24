import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { accessRequired, authConfig, isStaff, isMember, staffRoute } from "./lib/access";

export async function proxy(request: NextRequest) {
  if (!accessRequired()) return NextResponse.next();
  let response = NextResponse.next({ request });
  const finish = (target = response) => {
    if (target !== response) response.cookies.getAll().forEach(c => target.cookies.set(c));
    target.headers.set("Cache-Control", "private, no-store, max-age=0");
    return target;
  };
  const pathname = request.nextUrl.pathname;
  const publicRoute = pathname === "/" || pathname === "/login" || pathname === "/auth/callback" || pathname === "/account";
  const config = authConfig();
  if (!config) return finish(publicRoute ? response : NextResponse.redirect(new URL("/login", request.url)));
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!publicRoute && (error || !isMember(user))) {
      const url = new URL("/login", request.url);
      if (user && !error) url.searchParams.set("notice", "confirm");
      return finish(NextResponse.redirect(url));
    }
    if (!publicRoute && staffRoute(pathname) && !isStaff(user)) return finish(NextResponse.redirect(new URL("/dashboard", request.url)));
  } catch {
    if (!publicRoute) return finish(NextResponse.redirect(new URL("/login?notice=unavailable", request.url)));
  }
  return finish();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
