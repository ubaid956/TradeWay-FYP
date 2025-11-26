import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import api from "../lib/api";

const STATUS_FILTERS = [
	{ value: "pending", label: "Pending" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" },
	{ value: "all", label: "All" },
];

const formatDateTime = (value) => {
	if (!value) return "—";
	try {
		return format(new Date(value), "dd MMM yyyy, HH:mm");
	} catch {
		return value;
	}
};

const detailRows = [
	{ key: "cnicNumber", label: "CNIC" },
	{ key: "licenseNumber", label: "License" },
	{
		key: "licenseExpiry",
		label: "License Expiry",
		formatter: (val) => (val ? formatDateTime(val).split(",")[0] : "—"),
	},
	{ key: "truckRegistrationNumber", label: "Truck Registration" },
	{ key: "truckType", label: "Truck Type" },
	{ key: "drivingExperienceYears", label: "Experience (yrs)" },
	{ key: "additionalNotes", label: "Notes" },
];

const documentKeys = [
	{ key: "cnicFrontImage", label: "CNIC Front" },
	{ key: "cnicBackImage", label: "CNIC Back" },
	{ key: "licensePhoto", label: "License" },
	{ key: "truckPhoto", label: "Truck" },
];

export default function DriverVerifications() {
	const [statusFilter, setStatusFilter] = useState("pending");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [requests, setRequests] = useState([]);
	const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
	const [selectedId, setSelectedId] = useState(null);
	const [loading, setLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);
	const [error, setError] = useState("");

	const selectedRequest = useMemo(
		() => requests.find((req) => req._id === selectedId) || null,
		[requests, selectedId]
	);

	const loadRequests = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const { data } = await api.get("/api/admin/drivers/kyc", {
				params: {
					status: statusFilter,
					page,
					limit,
				},
			});
			const list = data?.data || [];
			setRequests(list);
			setPagination(data?.pagination || { total: 0, totalPages: 1 });
			setSelectedId((current) => {
				if (!list.length) return null;
				return list.some((req) => req._id === current) ? current : list[0]._id;
			});
		} catch (err) {
			console.error("Failed to load driver verifications", err);
			setError(
				err?.response?.data?.message ||
					"Unable to load driver verification requests"
			);
		} finally {
			setLoading(false);
		}
	}, [statusFilter, page, limit]);

	useEffect(() => {
		loadRequests();
	}, [loadRequests]);

	async function reviewRequest(action) {
		if (!selectedRequest?._id) return;

		let body;
		const endpoint = `/api/admin/drivers/kyc/${selectedRequest._id}/${action}`;

		if (action === "reject") {
			const reason = window.prompt("Enter rejection reason");
			if (!reason) {
				return;
			}
			body = { reason };
		}

		setActionLoading(true);
		setError("");
		try {
			await api.post(endpoint, body);
			await loadRequests();
		} catch (err) {
			console.error(`Failed to ${action} KYC`, err);
			setError(err?.response?.data?.message || `Unable to ${action} request`);
		} finally {
			setActionLoading(false);
		}
	}

	const totalPages = pagination.totalPages || 1;

	return (
		<>
			<h2>Driver Verifications</h2>
			<div
				className="grid cols-3"
				style={{ gap: 16, marginBottom: 16 }}
			>
				<div className="card">
					<div className="small">Status</div>
					<select
						className="input"
						value={statusFilter}
						onChange={(e) => {
							setStatusFilter(e.target.value);
							setPage(1);
						}}
					>
						{STATUS_FILTERS.map((status) => (
							<option
								key={status.value}
								value={status.value}
							>
								{status.label}
							</option>
						))}
					</select>
				</div>
				<div className="card">
					<div className="small">Page</div>
					<input
						className="input"
						type="number"
						min="1"
						value={page}
						onChange={(e) => setPage(Number(e.target.value) || 1)}
					/>
				</div>
				<div className="card">
					<div className="small">Page Size</div>
					<input
						className="input"
						type="number"
						min="5"
						max="50"
						value={limit}
						onChange={(e) => setLimit(Number(e.target.value) || 10)}
					/>
				</div>
			</div>

			{error && (
				<div
					className="card"
					style={{
						border: "1px solid rgba(248, 113, 113, 0.4)",
						color: "var(--danger)",
					}}
				>
					{error}
				</div>
			)}

			<div
				className="grid cols-2"
				style={{ gap: 16 }}
			>
				<div
					className="card"
					style={{ overflowX: "auto" }}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginBottom: 12,
						}}
					>
						<strong>Requests</strong>
						<button
							className="btn"
							onClick={loadRequests}
							disabled={loading}
						>
							{loading ? "Loading…" : "Refresh"}
						</button>
					</div>
					<table className="table">
						<thead>
							<tr>
								<th>Driver</th>
								<th>Email</th>
								<th>Status</th>
								<th>Submitted</th>
							</tr>
						</thead>
						<tbody>
							{requests.length === 0 && (
								<tr>
									<td
										colSpan={4}
										style={{ textAlign: "center", padding: 24 }}
									>
										{loading ? "Loading…" : "No requests"}
									</td>
								</tr>
							)}
							{requests.map((req) => (
								<tr
									key={req._id}
									onClick={() => setSelectedId(req._id)}
									style={{
										cursor: "pointer",
										background:
											selectedId === req._id ? "var(--card)" : "transparent",
									}}
								>
									<td>{req.user?.name || "—"}</td>
									<td>{req.user?.email || "—"}</td>
									<td style={{ textTransform: "capitalize" }}>{req.status}</td>
									<td>{formatDateTime(req.submittedAt)}</td>
								</tr>
							))}
						</tbody>
					</table>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginTop: 12,
						}}
					>
						<div className="small">
							Page {page} of {totalPages} · {pagination.total || 0} total
						</div>
						<div style={{ display: "flex", gap: 8 }}>
							<button
								className="btn"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								Prev
							</button>
							<button
								className="btn"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => (p >= totalPages ? p : p + 1))}
							>
								Next
							</button>
						</div>
					</div>
				</div>

				<div className="card">
					<strong>Details</strong>
					{!selectedRequest && (
						<div style={{ marginTop: 12 }}>Select a request to review.</div>
					)}
					{selectedRequest && (
						<div
							style={{
								marginTop: 12,
								display: "flex",
								flexDirection: "column",
								gap: 12,
							}}
						>
							<div>
								<div className="small">Driver</div>
								<div style={{ fontWeight: 600 }}>
									{selectedRequest.user?.name || "—"}
								</div>
								<div className="small">
									{selectedRequest.user?.email || "—"}
								</div>
								<div className="small">
									{selectedRequest.user?.phone || "—"}
								</div>
							</div>
							<div>
								<div className="small">Status</div>
								<span style={{ textTransform: "capitalize" }}>
									{selectedRequest.status}
								</span>
								{selectedRequest.rejectionReason && (
									<div
										className="small"
										style={{ color: "var(--danger)" }}
									>
										{selectedRequest.rejectionReason}
									</div>
								)}
							</div>
							<div
								className="grid cols-2"
								style={{ gap: 8 }}
							>
								<div>
									<div className="small">Submitted</div>
									<div>{formatDateTime(selectedRequest.submittedAt)}</div>
								</div>
								<div>
									<div className="small">Reviewed</div>
									<div>{formatDateTime(selectedRequest.reviewedAt)}</div>
								</div>
							</div>
							<div>
								<div
									className="small"
									style={{ marginBottom: 4 }}
								>
									Driver Details
								</div>
								<div
									className="grid cols-2"
									style={{ gap: 8 }}
								>
									{detailRows.map((row) => (
										<div key={row.key}>
											<div className="small">{row.label}</div>
											<div>
												{row.formatter
													? row.formatter(
															selectedRequest.driverDetails?.[row.key]
													  )
													: selectedRequest.driverDetails?.[row.key] ?? "—"}
											</div>
										</div>
									))}
								</div>
							</div>
							<div>
								<div
									className="small"
									style={{ marginBottom: 4 }}
								>
									Documents
								</div>
								<div
									className="grid cols-2"
									style={{ gap: 8 }}
								>
									{documentKeys.map(({ key, label }) => {
										const url = selectedRequest.driverDetails?.[key];
										if (!url) {
											return (
												<div key={key}>
													<div className="small">{label}</div>
													<div>—</div>
												</div>
											);
										}
										return (
											<div key={key}>
												<div className="small">{label}</div>
												<a
													href={url}
													target="_blank"
													rel="noreferrer"
													className="btn"
													style={{
														display: "inline-flex",
														padding: "4px 8px",
														fontSize: 12,
													}}
												>
													View
												</a>
											</div>
										);
									})}
								</div>
							</div>
							<div style={{ display: "flex", gap: 8 }}>
								<button
									className="btn"
									disabled={
										actionLoading || selectedRequest.status === "approved"
									}
									onClick={() => reviewRequest("approve")}
								>
									{actionLoading && selectedRequest.status !== "approved"
										? "Processing…"
										: "Approve"}
								</button>
								<button
									className="btn"
									style={{
										background: "var(--danger)",
										borderColor: "var(--danger)",
									}}
									disabled={
										actionLoading || selectedRequest.status === "rejected"
									}
									onClick={() => reviewRequest("reject")}
								>
									Reject
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
