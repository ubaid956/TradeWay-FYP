import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null); // {email, role, fullName}
	const [token, setToken] = useState(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const raw = localStorage.getItem("tw:auth");
		if (raw) {
			const { token, user } = JSON.parse(raw);
			setToken(token);
			setUser(user);
		}
		setReady(true);
	}, []);

	const login = async (email, password) => {
		const { data } = await api.post("/api/auth/login", { email, password });
		if (data?.ok) {
			const payload = { token: data.token, user: data.user };
			localStorage.setItem("tw:auth", JSON.stringify(payload));
			setToken(data.token);
			setUser(data.user);
		} else {
			throw new Error("Invalid credentials");
		}
	};

	const logout = () => {
		localStorage.removeItem("tw:auth");
		setToken(null);
		setUser(null);
	};

	const value = useMemo(
		() => ({ user, token, login, logout, ready }),
		[user, token, ready]
	);
	return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthCtx);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
}
