import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
	display: "block",
	padding: "10px 12px",
	borderRadius: 8,
	background: isActive ? "var(--card)" : "transparent",
	border: isActive ? "1px solid var(--border)" : "1px solid transparent",
	color: "var(--text)",
	marginBottom: 6,
});

export default function Sidebar() {
	return (
		<div className="sidebar">
			<div style={{ marginBottom: 12, color: "var(--muted)" }}>Navigation</div>
			<NavLink
				to="/"
				style={linkStyle}
				end
			>
				Dashboard
			</NavLink>
			<NavLink
				to="/price-index"
				style={linkStyle}
			>
				Price Index
			</NavLink>
			<NavLink
				to="/forecasts"
				style={linkStyle}
			>
				Forecasts
			</NavLink>
			<NavLink
				to="/sellers"
				style={linkStyle}
			>
				Sellers
			</NavLink>
			<NavLink
				to="/industry-updates"
				style={linkStyle}
			>
				Industry Updates
			</NavLink>
		</div>
	);
}
