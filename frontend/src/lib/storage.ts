
const keys = Object.freeze({
    user: 'auth_user'
})

const hasStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage

const safeSet = (key: string, value: unknown) => {
    if (!hasStorage()) return
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
        console.error('failed')
    }
}

export const setUser = (user: unknown) => safeSet(keys.user, user)