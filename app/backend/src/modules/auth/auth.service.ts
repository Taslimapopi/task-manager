import * as userRepository from "@modules/user/user.repository.js"
import bcrypt from 'bcryptjs'
import {toAuthUser} from "@modules/user/user.mapper.js";

export interface RegisterInput {
    name?: string,
    email?: string,
    password?: string
}

export const registerUser = async (input: RegisterInput) => {
    const {name, email, password} = input
    if (!name || !email || !password) {
        throw new Error('all fields are required')
    }
    if (password.length < 6) {
        throw new Error('password must be at least 6 characters')
    }
    const existingUser = await userRepository.findUserByEmail(email)
    if (existingUser) {
        throw new Error('user already exists')
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await userRepository.createUser({name, email, password: hashedPassword})
    return {user: toAuthUser(user)}
}