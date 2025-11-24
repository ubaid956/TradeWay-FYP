import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { format } from "date-fns";
import LineChart from "../components/LineChart";

export function PriceIndex() {
	const [rows, setRows] = useState([]);
	const [category, setCategory] = useState("Carrara");
	const [loading, setLoading] = useState(true);
	const [timeRange, setTimeRange] = useState("ytd");

	const categories = [
		"Carrara",
		"Travertine",
		"Emperador",
		"Calacatta",
		"Statuario",
	];

	const getDateRange = () => {
		const today = new Date();
		let from;

		switch (timeRange) {
			case "6m":
				from = new Date(today.setMonth(today.getMonth() - 6));
				break;
			case "year":
				from = new Date(today.setFullYear(today.getFullYear() - 1));
				break;
			case "ytd":
			default:
				from = new Date(today.getFullYear(), 0, 1);
		}

		return {
			from: format(from, "yyyy-MM-dd"),
			to: format(new Date(), "yyyy-MM-dd"),
		};
	};

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const { from, to } = getDateRange();
			const { data } = await api.get("/api/admin/price-index", {
				params: { category, from, to },
			});
			setRows(Array.isArray(data?.index) ? data.index : []);
		} catch (err) {
			console.error("Failed to load price index:", err);
		} finally {
			setLoading(false);
		}
	}, [category, timeRange]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const labels = rows.map((r) => r.period);
	const avgPrices = rows.map((r) => r.avgPrice);
	const volumes = rows.map((r) => r.volume);

	const avgPrice =
		rows.length > 0
			? (rows.reduce((sum, r) => sum + r.avgPrice, 0) / rows.length).toFixed(2)
			: 0;

	const totalVolume = rows.reduce((sum, r) => sum + r.volume, 0);

	const priceChange =
		rows.length >= 2
			? (
					((rows[rows.length - 1].avgPrice - rows[0].avgPrice) /
						rows[0].avgPrice) *
					100
			  ).toFixed(1)
			: 0;

	return (
		<div className="fade-in">
			<h2>Price Index Analysis</h2>
			<p
				className="small"
				style={{ marginTop: "8px", marginBottom: "24px" }}
			>
				Track pricing trends and volume metrics across marble categories
			</p>

			<div
				className="grid cols-4"
				style={{ marginBottom: "20px" }}
			>
				<div className="kpi-card">
					<div className="kpi-label">Average Price</div>
					<div className="kpi-value">${avgPrice}</div>
					<div className="kpi-hint">Per unit</div>
				</div>

				<div className="kpi-card">
					<div className="kpi-label">Total Volume</div>
					<div className="kpi-value">{totalVolume.toLocaleString()}</div>
					<div className="kpi-hint">Units sold</div>
				</div>

				<div className="kpi-card">
					<div className="kpi-label">Price Change</div>
					<div
						className="kpi-value"
						style={{
							color: priceChange >= 0 ? "var(--success)" : "var(--danger)",
						}}
					>
						{priceChange >= 0 ? "+" : ""}
						{priceChange}%
					</div>
					<div className="kpi-hint">Period change</div>
				</div>

				<div className="kpi-card">
					<div className="kpi-label">Data Points</div>
					<div className="kpi-value">{rows.length}</div>
					<div className="kpi-hint">Monthly records</div>
				</div>
			</div>

			<div className="filters-section">
				<div
					className="card"
					style={{ padding: "16px" }}
				>
					<label
						className="small"
						style={{ marginBottom: "8px", display: "block" }}
					>
						Category
					</label>
					<select
						className="input"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					>
						{categories.map((cat) => (
							<option
								key={cat}
								value={cat}
							>
								{cat}
							</option>
						))}
					</select>
				</div>

				<div
					className="card"
					style={{ padding: "16px" }}
				>
					<label
						className="small"
						style={{ marginBottom: "8px", display: "block" }}
					>
						Time Range
					</label>
					<select
						className="input"
						value={timeRange}
						onChange={(e) => setTimeRange(e.target.value)}
					>
						<option value="6m">Last 6 Months</option>
						<option value="ytd">Year to Date</option>
						<option value="year">Last 12 Months</option>
					</select>
				</div>
			</div>

			{loading ? (
				<div className="loading">Loading price data...</div>
			) : (
				<>
					<div
						className="grid cols-2"
						style={{ marginTop: "20px" }}
					>
						<LineChart
							title="Average Price Trend"
							labels={labels}
							series={[{ name: "Avg Price ($)", data: avgPrices }]}
						/>
						<LineChart
							title="Sales Volume Trend"
							labels={labels}
							series={[{ name: "Volume (units)", data: volumes }]}
						/>
					</div>

					<div
						className="card"
						style={{ marginTop: "20px" }}
					>
						<h3 style={{ marginBottom: "16px" }}>Detailed Breakdown</h3>
						<div className="table-wrapper">
							<table className="table">
								<thead>
									<tr>
										<th>Month</th>
										<th>Avg Price</th>
										<th>Volume</th>
										<th>Month-over-Month</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((r, i) => {
										const prevPrice = i > 0 ? rows[i - 1].avgPrice : r.avgPrice;
										const mom = (
											((r.avgPrice - prevPrice) / prevPrice) *
											100
										).toFixed(1);

										return (
											<tr key={r.period}>
												<td style={{ fontWeight: 600 }}>{r.period}</td>
												<td style={{ color: "var(--accent)" }}>
													${r.avgPrice.toFixed(2)}
												</td>
												<td>{r.volume.toLocaleString()}</td>
												<td>
													<span
														style={{
															color:
																mom >= 0 ? "var(--success)" : "var(--danger)",
															fontWeight: 600,
														}}
													>
														{i === 0 ? "—" : `${mom >= 0 ? "+" : ""}${mom}%`}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
export default PriceIndex;
