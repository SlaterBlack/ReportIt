export type UserTheme = "default" | "retro";
export type UserRole = "admin" | "user" | "demo";

export interface User {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  theme?: UserTheme | null;
}

export type UserName = Pick<User, "id" | "name">;

export interface AuthResponse {
  token: string;
  user: User;
}
