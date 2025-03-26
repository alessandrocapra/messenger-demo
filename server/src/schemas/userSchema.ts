import { z } from "zod";

export const registerSchema = z.object({
  email: z.string({ message: "Email required" }).email("Invalid email format"),
  password: z.string({ message: "Password required" }).min(8, "Password must be at least 8 characters long").max(32, "Password must be at most 32 characters long")
})

export const loginSchema = z.object({
  email: z.string({ message: "Email required" }).email("Invalid email format"),
  password: z.string({ message: "Password required" }).min(1, "Password required")
})
