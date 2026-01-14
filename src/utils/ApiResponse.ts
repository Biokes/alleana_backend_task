import { Response } from 'express';
export default class ApiResponse<T>{ 

    readonly timeStamp: Date;
    readonly success: boolean;
    readonly statusCode: number;
    readonly data: T;
    readonly message: string | undefined;
    
    constructor(success: boolean, statusCode: number,data: T, message?: string) {
        this.timeStamp = new Date();
        this.success = success;
        this.data = data;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data as T;
    }

    static success<T>(res: Response,data:T, statusCode: number= 200, message?: string) {
        return res.status(statusCode).json(new ApiResponse(true, statusCode,data, message))
    }

    static error<T>(res: Response, statusCode: number= 400, error: T, message?: string) {
        return res.status(statusCode).json(new ApiResponse<T>(false, statusCode, error, message))
    }
}