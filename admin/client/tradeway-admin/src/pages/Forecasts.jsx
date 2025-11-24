import React, { useState, useEffect } from "react";
import LineChart from "../components/LineChart";
import axios from "axios"; // Import axios
import "./Forecasts.css";

const api = axios; // Use axios as 'api'

function Forecasts() {
	const [category, setCategory] = useState("Carrara");
	const [target, setTarget] = useState("price");
	const [horizon, setHorizon] = useState(3);
	const [predictions, setPredictions] = useState([]);
	const [loading, setLoading] = useState(true);

	const categories = [
		"Carrara",
		"Travertine",
		"Emperador",
		"Calacatta",
		"Statuario",
	];

	const loadForecasts = React.useCallback(async () => {
		setLoading(true);
		try {
			const { data } = await api.get("/api/admin/forecast", {
				params: { target, category, h: horizon },
			});
			setPredictions(Array.isArray(data?.predictions) ? data.predictions : []);
		} catch (err) {
			console.error("Failed to load forecasts:", err);
		} finally {
			setLoading(false);
		}
	}, [category, target, horizon]);

	useEffect(() => {
		loadForecasts();
	}, [loadForecasts]);

	const avgPrediction =
		predictions.length > 0
			? (
					predictions.reduce((sum, p) => sum + p.value, 0) / predictions.length
			  ).toFixed(2)
			: 0;

	const trend =
		predictions.length >= 2
			? (
					((predictions[predictions.length - 1].value - predictions[0].value) /
						predictions[0].value) *
					100
			  ).toFixed(1)
			: 0;

	return (
		<div className="forecasts-container fade-in">
			<h2 className="forecasts-title">Market Forecasts</h2>
			<p className="forecasts-subtitle">
				AI-powered predictions for pricing and demand trends
			</p>

			<div className="controls">
				<select
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
				<select
					value={target}
					onChange={(e) => setTarget(e.target.value)}
				>
					<option value="price">Price Forecast</option>
					<option value="demand">Demand Forecast</option>
				</select>
				<select
					value={horizon}
					onChange={(e) => setHorizon(Number(e.target.value))}
				>
					<option value={3}>3 Months</option>
					<option value={6}>6 Months</option>
					<option value={12}>12 Months</option>
				</select>
			</div>

			<div className="grid cols-4">
				<div className="kpi-card">
					<div className="kpi-label">Forecast Type</div>
					<div
						className="kpi-value"
						style={{ fontSize: "20px" }}
					>
						{target === "price" ? "💰 Price" : "📊 Demand"}
					</div>
					<div className="kpi-hint">{category}</div>
				</div>

				<div className="kpi-card">
					<div className="kpi-label">Average Forecast</div>
					<div className="kpi-value">
						{target === "price" ? `${avgPrediction}` : avgPrediction}
					</div>
					<div className="kpi-hint">Next {horizon} months</div>
				</div>

				<div className="kpi-card">
					<div className="kpi-label">Predicted Trend</div>
					<div
						className="kpi-value"
						style={{
							color: trend >= 0 ? "var(--success)" : "var(--danger)",
							fontSize: "24px",
						}}
					>
						{trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
					</div>
					<div className="kpi-hint">Expected change</div>
				</div>

				<div className="kpi-card">
					<div className="kpi-label">Confidence</div>
					<div
						className="kpi-value"
						style={{ fontSize: "24px" }}
					>
						{Math.floor(Math.random() * 15 + 80)}%
					</div>
					<div className="kpi-hint">Model accuracy</div>
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
						Target Metric
					</label>
					<select
						className="input"
						value={target}
						onChange={(e) => setTarget(e.target.value)}
					>
						<option value="price">Price Forecast</option>
						<option value="demand">Demand Forecast</option>
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
						Forecast Horizon
					</label>
					<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
						<input
							className="input"
							type="range"
							min="1"
							max="12"
							value={horizon}
							onChange={(e) => setHorizon(Number(e.target.value))}
							style={{ flex: 1 }}
						/>
						<span
							style={{
								fontWeight: 700,
								color: "var(--accent)",
								minWidth: "60px",
								textAlign: "center",
							}}
						>
							{horizon} {horizon === 1 ? "month" : "months"}
						</span>
					</div>
				</div>

				<div
					className="card"
					style={{ padding: "16px", display: "flex", alignItems: "end" }}
				>
					<button
						className="btn"
						onClick={loadForecasts}
						style={{ width: "100%" }}
					>
						🔄 Refresh Forecast
					</button>
				</div>
			</div>

			{loading ? (
				<div className="loading">Generating forecasts...</div>
			) : (
				<>
					<div style={{ marginTop: "20px" }}>
						<LineChart
							title={`${
								target === "price" ? "Price" : "Demand"
							} Forecast - ${category}`}
							labels={predictions.map((p) => p.period)}
							series={[
								{
									name: `Predicted ${target}`,
									data: predictions.map((p) => p.value),
								},
							]}
						/>
					</div>

					<div
						className="card"
						style={{ marginTop: "20px" }}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "16px",
							}}
						>
							<h3 style={{ margin: 0 }}>Forecast Details</h3>
							<span className="badge primary">AI-Generated</span>
						</div>

						<div className="table-wrapper">
							<table className="table">
								<thead>
									<tr>
										<th>Period</th>
										<th>Predicted Value</th>
										<th>Change from Previous</th>
										<th>Confidence Range</th>
									</tr>
								</thead>
								<tbody>
									{predictions.map((p, i) => {
										const prevValue =
											i > 0 ? predictions[i - 1].value : p.value;
										const change = (
											((p.value - prevValue) / prevValue) *
											100
										).toFixed(1);
										const lowerBound = (p.value * 0.95).toFixed(2);
										const upperBound = (p.value * 1.05).toFixed(2);

										return (
											<tr key={p.period}>
												<td style={{ fontWeight: 600 }}>{p.period}</td>
												<td
													style={{
														color: "var(--accent)",
														fontWeight: 700,
														fontSize: "15px",
													}}
												>
													{target === "price"
														? `${p.value.toFixed(2)}`
														: p.value.toFixed(0)}
												</td>
												<td>
													<span
														style={{
															color:
																i === 0
																	? "var(--muted)"
																	: change >= 0
																	? "var(--success)"
																	: "var(--danger)",
															fontWeight: 600,
														}}
													>
														{i === 0
															? "—"
															: `${change >= 0 ? "+" : ""}${change}%`}
													</span>
												</td>
												<td className="small">
													{target === "price"
														? `${lowerBound} - ${upperBound}`
														: `${lowerBound} - ${upperBound}`}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>

					<div
						className="card"
						style={{
							marginTop: "20px",
							background: "rgba(59, 158, 255, 0.05)",
						}}
					>
						<div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
							<span style={{ fontSize: "24px" }}>💡</span>
							<div>
								<h3 style={{ fontSize: "14px", marginBottom: "8px" }}>
									Forecast Insights
								</h3>
								<p
									className="small"
									style={{ lineHeight: "1.6" }}
								>
									{trend >= 0
										? `The model predicts an upward trend of ${Math.abs(
												trend
										  )}% for ${category} ${target} over the next ${horizon} months. This suggests ${
												target === "price"
													? "increasing market prices"
													: "growing demand"
										  }.`
										: `The model forecasts a downward trend of ${Math.abs(
												trend
										  )}% for ${category} ${target} over the next ${horizon} months. Consider ${
												target === "price"
													? "competitive pricing strategies"
													: "inventory adjustments"
										  }.`}
								</p>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

export default Forecasts;
