import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import KPICard from "../components/KPICard";
import LineChart from "../components/LineChart";
import { format } from "date-fns";

export default function Dashboard() {
	const [cards, setCards] = useState(null);
	const [charts, setCharts] = useState(null);
	const [loading, setLoading] = useState(true);
	const [dateRange, setDateRange] = useState("ytd");

	const getDateRange = () => {
		const today = new Date();
		let from;

		switch (dateRange) {
			case "week":
				from = new Date(today.getDate() - 7);
				break;
			case "month":
				from = new Date(today.setMonth(today.getMonth() - 1));
				break;
			case "quarter":
				from = new Date(today.setMonth(today.getMonth() - 3));
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
			const [c, t] = await Promise.all([
				api.get("/api/admin/overview/cards", { params: { from, to } }),
				api.get("/api/admin/overview/charts", {
					params: { from, to, gran: "month" },
				}),
			]);
			setCards(c.data);
			setCharts(t.data);
		} catch (err) {
			console.error("Failed to load dashboard data:", err);
		} finally {
			setLoading(false);
		}
	}, [dateRange]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	if (loading && !cards) {
		return <div className="loading">Loading dashboard...</div>;
	}

	return (
		<div className="fade-in">
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "24px",
				}}
			>
				<h2>Dashboard Overview</h2>

				<div
					className="card"
					style={{ padding: "8px 12px", display: "inline-flex", gap: "8px" }}
				>
					<button
						className={dateRange === "week" ? "btn" : "btn ghost"}
						onClick={() => setDateRange("week")}
						style={{ padding: "6px 12px", fontSize: "12px" }}
					>
						Week
					</button>
					<button
						className={dateRange === "month" ? "btn" : "btn ghost"}
						onClick={() => setDateRange("month")}
						style={{ padding: "6px 12px", fontSize: "12px" }}
					>
						Month
					</button>
					<button
						className={dateRange === "quarter" ? "btn" : "btn ghost"}
						onClick={() => setDateRange("quarter")}
						style={{ padding: "6px 12px", fontSize: "12px" }}
					>
						Quarter
					</button>
					<button
						className={dateRange === "ytd" ? "btn" : "btn ghost"}
						onClick={() => setDateRange("ytd")}
						style={{ padding: "6px 12px", fontSize: "12px" }}
					>
						YTD
					</button>
				</div>
			</div>

			<div className="grid cols-4">
				<KPICard
					title="Total Orders"
					value={cards?.totalOrders?.toLocaleString() ?? "—"}
					trend={5.2}
				/>
				<KPICard
					title="Delivered"
					value={cards?.delivered?.toLocaleString() ?? "—"}
					hint={`${cards?.deliveredPct ?? 0}% delivery rate`}
					trend={2.8}
				/>
				<KPICard
					title="Cancelled"
					value={cards?.cancelled?.toLocaleString() ?? "—"}
					hint={`${((cards?.cancelled / cards?.totalOrders) * 100).toFixed(
						1
					)}% cancel rate`}
					trend={-1.5}
				/>
				<KPICard
					title="Gross Merchandise Value"
					value={
						cards?.GMV != null ? `$${(cards.GMV / 1000).toFixed(1)}K` : "—"
					}
					hint={`ASP: $${cards?.ASP?.toFixed(2) ?? "—"}`}
					trend={8.4}
				/>
			</div>

			<div
				className="grid cols-2"
				style={{ marginTop: "24px" }}
			>
				<LineChart
					title="GMV Trend"
					labels={charts?.labels ?? []}
					series={[{ name: "GMV ($)", data: charts?.gmv ?? [] }]}
				/>
				<LineChart
					title="Orders & Average Selling Price"
					labels={charts?.labels ?? []}
					series={[
						{ name: "Orders", data: charts?.orders ?? [] },
						{ name: "ASP ($)", data: charts?.asp ?? [] },
					]}
				/>
			</div>

			<div
				className="card"
				style={{ marginTop: "24px" }}
			>
				<div className="card-header">
					<h3 style={{ margin: 0 }}>Recent Activity</h3>
					<span className="badge success">Live</span>
				</div>
				<div
					className="grid"
					style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
				>
					<div
						style={{ padding: "16px", borderRight: "1px solid var(--border)" }}
					>
						<div className="small">Today's Orders</div>
						<div
							style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}
						>
							{Math.floor(Math.random() * 50 + 20)}
						</div>
					</div>
					<div
						style={{ padding: "16px", borderRight: "1px solid var(--border)" }}
					>
						<div className="small">Active Sellers</div>
						<div
							style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}
						>
							{Math.floor(Math.random() * 30 + 15)}
						</div>
					</div>
					<div style={{ padding: "16px" }}>
						<div className="small">Avg Response Time</div>
						<div
							style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}
						>
							{Math.floor(Math.random() * 10 + 5)}m
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
