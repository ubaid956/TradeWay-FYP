import { useEffect, useState } from "react";
import api from "../lib/api";
import { format } from "date-fns";

export default function Sellers() {
	const [rows, setRows] = useState([]);
	const [sort, setSort] = useState("-gmv");
	const [limit, setLimit] = useState(25);
	const [offset, setOffset] = useState(0);

	const from = `${new Date().getFullYear()}-01-01`;
	const to = format(new Date(), "yyyy-MM-dd");

	async function load() {
		const { data } = await api.get("/api/admin/sellers/table", {
			params: { sort, limit, offset, from, to },
		});
		setRows(data?.rows || data || []);
	}

	useEffect(() => {
		load();
	}, [sort, limit, offset]);

	return (
		<>
			<h2>Sellers</h2>
			<div
				className="grid cols-4"
				style={{ margin: "12px 0" }}
			>
				<div className="card">
					<div className="small">Sort</div>
					<select
						className="input"
						value={sort}
						onChange={(e) => setSort(e.target.value)}
					>
						<option value="-gmv">GMV (desc)</option>
						<option value="cancelRate">Cancel Rate (asc)</option>
					</select>
				</div>
				<div className="card">
					<div className="small">Limit</div>
					<input
						className="input"
						type="number"
						min="10"
						max="100"
						value={limit}
						onChange={(e) => setLimit(Number(e.target.value))}
					/>
				</div>
				<div className="card">
					<div className="small">Offset</div>
					<input
						className="input"
						type="number"
						min="0"
						value={offset}
						onChange={(e) => setOffset(Number(e.target.value))}
					/>
				</div>
			</div>

			<div className="card">
				<table className="table">
					<thead>
						<tr>
							<th>Seller</th>
							<th>Orders</th>
							<th>Delivered %</th>
							<th>Cancel Rate</th>
							<th>GMV</th>
							<th>ASP</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r, i) => (
							<tr key={i}>
								<td>{r?.seller?.name ?? r?.seller?.email ?? "—"}</td>
								<td>{r.orders}</td>
								<td>{r.deliveredPct}%</td>
								<td>{r.cancelRate}%</td>
								<td>{r.gmv?.toLocaleString?.() ?? r.gmv}</td>
								<td>{r.asp}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
}
