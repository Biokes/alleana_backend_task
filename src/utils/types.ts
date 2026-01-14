export type AppConfig = {
    port: number,
    nodeENV: string,
    DB_USERNAME: string,
    DB_PASSWORD: string,
    DB_NAME: string,
    DB_HOST: string
}

export interface AppError extends Error {
  status?: number;
}
