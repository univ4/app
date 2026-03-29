import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const authHeader =
    headerList.get("authorization") ?? headerList.get("Authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can be called in Server Components during render.
            // Ignore when setting cookies is not allowed; middleware handles refresh.
          }
        },
      },
      global:
        bearerToken && bearerToken.length > 0
          ? {
              headers: {
                Authorization: `Bearer ${bearerToken}`,
              },
            }
          : {},
    },
  );
}

/**
 * 세션 쿠키 또는 `Authorization: Bearer` 액세스 토큰으로 사용자를 식별합니다.
 * Bearer가 있으면 해당 JWT로 검증합니다(RLS·RPC에 동일 토큰이 전달되도록 createClient와 함께 사용).
 */
export async function getAuthUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<User | null> {
  const headerList = await headers();
  const authHeader =
    headerList.get("authorization") ?? headerList.get("Authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (bearerToken) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearerToken);
    if (error || !user) return null;
    return user;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
