import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/server/session";

export default async function Home() {
  const cookieStore = await cookies();
  redirect(
    cookieStore.has(ACCESS_COOKIE) || cookieStore.has(REFRESH_COOKIE)
      ? "/dashboard"
      : "/login",
  );
}
