import {createContext} from "react";
import {AuthState} from "@/store/auth/AuthReducer";

export interface AuthActionsValue {
    register: (data: { name: string; email: string; password: string }) => Promise<boolean>
}

export const AuthStateContext = createContext<AuthState | null>(null)
export const AuthActionsContext = createContext<AuthActionsValue | null>(null)