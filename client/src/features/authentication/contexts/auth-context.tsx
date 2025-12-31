import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMeOptions } from "../queries/get-me";

interface User {
	id: string;
	name: string;
	email: string;
	image?: string;
}

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const { data: user, isLoading, error } = useQuery(getMeOptions());

	const value: AuthContextType = {
		user: user ?? null,
		isLoading,
		isAuthenticated: !!user,
		error: error as Error | null,
	};

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}

export type { User, AuthContextType };
