import {User} from "@modules/user/user.model.js";

interface CreateUser {
    name : string,
    email : string,
    password: string,
    
}

export const findByEmail = (email:string)=>User.findOne({email : email.toLowerCase()})

export const createUser = (data:CreateUser) => User.create(data)