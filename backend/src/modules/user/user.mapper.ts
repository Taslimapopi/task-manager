interface MappableUser {
    id: string,
    name: string,
    email: string,
    createdAt?: Date
}
export const toAuthUser = (user: MappableUser) => ({
    id: user.id,
    name: user.name,
    email: user.email
})