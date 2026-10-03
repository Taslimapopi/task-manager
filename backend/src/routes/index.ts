import {Router} from "express";
import {authRoutes} from "@modules/auth/auth.routes.js";

export const router = Router()

router.use('/auth', authRoutes)