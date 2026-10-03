import {Schema} from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'name is required'],
        trim: true,
        maxlength: [50, 'name cannot be exceed 50 characters']

    },
    email : {
        type: String,
        required: [true, 'email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'please provide your valid email']

    },
    password : {
        type: String,
        required: [true, 'password is required'],
        select: false
    }
},
    {
        timestamps: true,
        versionKey: false,
    })