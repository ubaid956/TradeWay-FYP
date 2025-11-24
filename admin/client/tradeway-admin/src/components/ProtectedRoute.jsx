import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
	children,
	roles = ["admin", "analyst"],
}) {
	const { user, ready } = useAuth();
	if (!ready) return <div className="loading">Loading...</div>;
	if (!user)
		return (
			<Navigate
				to="/login"
				replace
			/>
		);
	if (roles.length && !roles.includes(user.role))
		return (
			<Navigate
				to="/login"
				replace
			/>
		);
	return children;
}
