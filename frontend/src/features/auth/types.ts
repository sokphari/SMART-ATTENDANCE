import type { AuthUser } from "@/types/auth";

export type LoginResponse = {
  data: AuthUser;
  token: string;
};
