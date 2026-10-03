
export interface RegisterInput {
    name: string,
    email: string,
    password: string
}

export const registerUser = async (input: RegisterInput) => {
    const {name, email, password} = input
    if (!name || !email || !password) {
        throw new Error('all fields are required')
    }
    if (password.length < 6) {
        throw new Error('password must be at least 6 characters')
    }
}