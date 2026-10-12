import {User} from "@modules/user/user.model.js";

interface CreateUserData {
    name: string,
    email: string,
    password: string
}

export const findUserByEmail = (email: string) => User.findOne({email: email.toLowerCase()})

export const createUser = (data: CreateUserData) => User.create(data)