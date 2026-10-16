
interface ApiErrorShape {
    response?: {
        status?: number
        data?: {
            message?: string
        }
    }
    message?: string
}

const isApiError = (e: unknown): e is ApiErrorShape =>
    e !== null && typeof e === 'object' && 'message' in e

export const getErrorMessage = (error: unknown): string =>
    isApiError(error)
        ? error?.response?.data?.message || error?.message || 'Something went wrong'
        : 'Something went wrong'