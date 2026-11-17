"use server";

import { cookies } from "next/headers";

const TOKEN_COOKIE = "smart_attendance_token";

export async function setAuthCookie(
  token: string,
  remember: boolean = false,
): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}

export async function clearAuthCookie(): Promise<void> {
  (await cookies()).delete(TOKEN_COOKIE);
}
