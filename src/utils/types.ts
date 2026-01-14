import z from "zod";

const passwordSchema = z
	.string()
    .min(8, "Password must be at least 8 characters")
    .max(15, "Password must not be more than 15 Characters")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
	.regex(/[0-9]/, "Password must contain at least one number")
	.regex(/[^a-zA-Z0-9]/,"Password must contain at least one special character");

export const RegisterSchema = z.object({
	email: z.email("Invalid email provided"),
	password: passwordSchema,
	name: z.string().min(2, "Name must be at least 2 characters")
});

export const LoginSchema = z.object({
    email: z.email("Invalid email provided"),
    password: passwordSchema
})

export type RegisterDTO = z.infer<typeof RegisterSchema>;
export type LoginDTO = z.infer<typeof LoginSchema>;
export type AppConfig = {
    port: number,
    nodeENV: string,
    DB_USERNAME: string,
    DB_PASSWORD: string,
    DB_NAME: string,
    DB_HOST: string,
    JWT_SECRET: string,
    JWT_REFRESH_SECRET: string,
    PASSWORD_HASH: number
}

export interface AppError extends Error {
  status?: number;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}