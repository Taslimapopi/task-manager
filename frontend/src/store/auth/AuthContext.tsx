import {authReducer, AuthState} from "@/store/auth/AuthReducer";
import {ReactNode, useCallback, useMemo, useReducer} from "react";
import {AuthActions} from "@/store/auth/AuthActions";
import {AuthActionsContext, AuthActionsValue, AuthStateContext} from "@/store/auth/AuthContextValue";
import {authService} from "@/services/authService";
import {setUser} from "@/lib/storage";
import {getErrorMessage} from "@/lib/errors";

const initial_state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
}

export const AuthProvider = ({children}: {children: ReactNode}) => {
    const [state, dispatch] = useReducer(authReducer, initial_state)

    const register = useCallback(
        async (data: {name: string, email: string, password: string}) => {
            dispatch({type: AuthActions.set_loading, payload: true})
            try {
                const {user} = await authService.register(data)
                setUser(user)
                dispatch({type: AuthActions.login_success, payload: {user}})
                return true
            } catch (error) {
                dispatch({type: AuthActions.set_error, payload: getErrorMessage(error)})
                throw error
            }
        }
        ,[])

    const actionsValue = useMemo<AuthActionsValue>(() => ({register}), [register]);
    return (
        <AuthStateContext value={state}>
            <AuthActionsContext value={actionsValue}>{children}</AuthActionsContext>
        </AuthStateContext>
    )
}