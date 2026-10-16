export interface User {
    id?: string
    _id?: string
    name: string
    email: string
    createdAt?: string | Date
    updatedAt?: string | Date
}

export interface AuthResponseData {
    user: User
}

export interface ApiResponse {
    success: boolean,
    message?: string
}