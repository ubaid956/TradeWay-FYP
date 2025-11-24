import { useAuth } from "../context/AuthContext";

export default function Navbar() {
	const { user, logout } = useAuth();
	return (
		<div className="navbar">
			<div>
				<strong>TradeWay Admin</strong> <span className="badge">Analytics</span>
			</div>
			<div>
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
