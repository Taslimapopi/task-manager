import type {RegisterInput} from "@modules/auth/auth.service.js";
import * as authService from '@modules/auth/auth.service.js'
import type {Request, Response} from "express";

export const register = async (req: Request<unknown, unknown, RegisterInput>, res: Response): Promise<void> => {
    const result = await authService.registerUser(req.body)
}