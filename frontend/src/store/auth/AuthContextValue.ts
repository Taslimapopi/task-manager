import {createContext} from "react";


export interface AuthContextValue {
    register : (data:{name: string,email: string, password: string})=>Promise<boolean>;
}

export const AuthActionsContext = createContext<AuthContextValue | null>(null);