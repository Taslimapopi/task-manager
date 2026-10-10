import {User} from "@/types";
import {AuthActions} from "@/store/auth/AuthActions";

export interface AuthState {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
}

type AuthAction =
    | {type: typeof AuthActions.set_loading, payload: boolean}
    | {type: typeof AuthActions.login_success, payload: {user: User}}
    | {type: typeof AuthActions.set_error, payload: string | null}


export const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case AuthActions.set_loading:
            return {
                ...state,
                isLoading: action.payload
            }
        case AuthActions.login_success:
            return {
                ...state,
                user: action.payload.user,
                isAuthenticated: true,
                isLoading: false,
                error: null
            }
        case AuthActions.set_error:
            return {
                ...state,
                error: action.payload,
                isLoading:false
            }
        default:
            return state
    }
}