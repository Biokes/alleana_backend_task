import { User } from '../data/models';
import bcrypt from "bcrypt";
import { Request, Response } from 'express';
import AIleanaError, { EMAIL_ALREADY_EXIST, INVALID_DETAILS_PROVIDED, NO_SESSION_FOUND } from '../errors';
import { LoginDTO, RegisterDTO, UserRole } from '../utils/types';
import jwt from "jsonwebtoken";
import { appConfig } from '../config';
import { userRepository, UserRepository } from '../data/repositories/user';

class UserService {

    private readonly userRepository: UserRepository;

    constructor() {
        this.userRepository = userRepository;
    }

    async register(dto: RegisterDTO) {
        await this.validateEmailExistence(dto);
        const hashedPassword: string = await bcrypt.hash(dto.password, Number(appConfig.PASSWORD_HASH!))
        const user = await userRepository.create({ name: dto.name, password: hashedPassword, email: dto.email.toLowerCase(), role: UserRole.USER })
        const userResponse = { email: user.email, name: user.name, id: user.id, createdAt: user.createdAt }
        return userResponse
    }

    // async login(dto: LoginDTO) {
    //     const userFound = await this.userRepository.findOne({ where: { email: dto.email.toLowerCase() } });
    //     if (!userFound) throw new AIleanaError(INVALID_DETAILS_PROVIDED);
    //     const isValidPassword = await bcrypt.compare(dto.password, userFound.password);
    //     if (!isValidPassword) throw new AIleanaError(INVALID_DETAILS_PROVIDED);
    //     const token = await this.signToken(userFound);
    //     const refreshToken = jwt.sign({ userId: userFound.id }, appConfig.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
    //     return { token, refreshToken, user: { id: userFound.id, email: userFound.email, name: userFound.name } };
    // }

        async login(dto: LoginDTO){
        const userFound = await this.userRepository.findOne({ where: { email: dto.email.toLowerCase() } });
        if (!userFound) throw new AIleanaError(INVALID_DETAILS_PROVIDED);

        const isValidPassword = await bcrypt.compare(dto.password, userFound.password);
        if (!isValidPassword) throw new AIleanaError(INVALID_DETAILS_PROVIDED);

        const token = this.signToken(userFound);
        const refreshToken = jwt.sign({ userId: userFound.id }, appConfig.JWT_REFRESH_SECRET!, { expiresIn: '7d' });

        return {
            token,
            refreshToken,
            user: { id: userFound.id, email: userFound.email, name: userFound.name, role: userFound.role }
        };
    }

    async logout(req: Request, res: Response) {
        const token = req.cookies.refreshToken;
        if (!token) throw new AIleanaError(NO_SESSION_FOUND);
        try {
           jwt.verify(token, appConfig.JWT_REFRESH_SECRET!);
        } catch (error){
            throw new AIleanaError(NO_SESSION_FOUND);
        }

       res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "strict" });
       res.clearCookie("accessToken", { httpOnly: true, secure: true, sameSite: "strict" });       
       return true;
    }

    async refreshToken(incomingToken: string) {
        if (!incomingToken) throw new AIleanaError(NO_SESSION_FOUND);
        let payload: any;
        try {
            payload = jwt.verify(incomingToken, appConfig.JWT_REFRESH_SECRET!);
        } catch (err) {
            throw new AIleanaError(NO_SESSION_FOUND);
        }
        const user = await this.userRepository.findById(payload.userId);
        if (!user) throw new AIleanaError(NO_SESSION_FOUND);
        const newAccessToken = await this.signToken(user as User);
        return { accessToken: newAccessToken };
    }

    private async signToken(userFound: User) {
        const token = jwt.sign(
            { userId: userFound.id, email: userFound.email, role: userFound.role },
            appConfig.JWT_SECRET, { expiresIn: '24h' }
        );
        return token;
    }
   

    private async validateEmailExistence(dto: RegisterDTO) {
        if (!dto.email) throw new AIleanaError(INVALID_DETAILS_PROVIDED);
        const existingUserInDb = await this.userRepository.findOne({ where: { email: dto.email.toLowerCase() } });
        if (existingUserInDb) throw new AIleanaError(EMAIL_ALREADY_EXIST);
    }
}

export const userService = new UserService();