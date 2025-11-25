import { useAuth } from "../context/AuthContext";

export default function Navbar({ theme = "dark", onToggleTheme }) {
	const { user, logout } = useAuth();
	return (
		<div className="navbar">
			<div>
				<strong>TradeWay Admin</strong> <span className="badge">Analytics</span>
			</div>
			<div>
				<button
					className="btn ghost"
					onClick={onToggleTheme}
					style={{ marginRight: 12 }}
				>
					{theme === "dark" ? "Light Mode" : "Dark Mode"}
				</button>
				<span
					className="small"
					style={{ marginRight: 12 }}
				>
					{user?.fullName} • {user?.role}
				</span>
				<button
					className="btn ghost"
					onClick={logout}
				>
					Logout
				</button>
			</div>
		</div>
	);
}
