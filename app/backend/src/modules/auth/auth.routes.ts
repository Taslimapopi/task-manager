import {Router} from "express";
import {register} from "@modules/auth/auth.controllers.js";


export const authRoutes = Router()

authRoutes.post('/register', register)