import React from 'react'
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {AlertCircle} from "lucide-react";
import {useAuthActions} from "@/hooks/useAuthContext";

const Page = () => {
    const {register: registerUser} = useAuthActions()
    return (
        <div className="flex min-h-[80vh] items-center justify-center">
            <div className="w-full max-w-md p-8 bg-[#1e293b] rounded-2xl shadow-2xl border border-white/10">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-100">Create an Account</h1>
                    <p className="text-gray-400 mt-2">Start managing your tasks today</p>
                </div>

                <form className="space-y-4">
                    <Input
                        label="Name"
                        type="text"
                        placeholder="John Doe"
                    />

                    <Input
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                    />

                    <p className="-mt-2 text-xs text-gray-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />

                    </p>


                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                    />

                    <Button type="submit" className="w-full" >
                        Sign Up
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                    Already have an account?
                </p>
            </div>
        </div>
    )
}
export default Page