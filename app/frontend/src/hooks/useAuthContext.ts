import {useContext} from "react";
import {AuthActionsContext} from "@/store/auth/AuthContextValue";

export const useAuthActions = () => {
    const actions = useContext(AuthActionsContext)
    if (!actions) {
        throw new Error('useAuthActions must be used within an AuthProvider')
    }
    return actions
}