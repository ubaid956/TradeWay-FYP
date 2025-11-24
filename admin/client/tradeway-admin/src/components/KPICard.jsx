export default function KPICard({ title, value, hint, trend }) {
	return (
		<div className="kpi-card">
			<div className="kpi-label">{title}</div>
			<div className="kpi-value">
				{value}
				{trend && (
					<span
						style={{
							fontSize: "16px",
							marginLeft: "12px",
							color: trend > 0 ? "var(--success)" : "var(--danger)",
						}}
					>
						{trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
					</span>
				)}
			</div>
			{hint && <div className="kpi-hint">{hint}</div>}
		</div>
	);
}
