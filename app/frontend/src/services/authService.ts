import {ApiResponse, AuthResponseData} from "@/types";
import {apiClient} from "@/services/axios";

interface RegisterData {
    name: string,
    email: string,
    password: string
}

const assertAuthPayload = (data: AuthResponseData & ApiResponse): AuthResponseData => {
    if (!data.user) {
        throw new Error('Unexpected auth response');
    }
    return data
}

export const authService = {
    async register(data: RegisterData): Promise<AuthResponseData> {
        const response = await apiClient.post<AuthResponseData & ApiResponse>('/auth/register', data)
        return assertAuthPayload(response.data)
    }
}