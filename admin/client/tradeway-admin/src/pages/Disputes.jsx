import { useCallback, useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import api from "../lib/api";

const STATUS_FILTERS = [
	{ label: "All Disputes", value: "" },
	{ label: "Open", value: "open" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Closed", value: "closed" },
];

const STATUS_META = {
	open: {
		label: "Open",
		color: "#f59e0b",
		bg: "rgba(245,158,11,0.2)",
	},
	resolved: {
		label: "Resolved",
		color: "#10b981",
		bg: "rgba(16,185,129,0.2)",
	},
	closed: {
		label: "Closed",
		color: "#6b7280",
		bg: "rgba(107,114,128,0.2)",
	},
};

const getStatusMeta = (status = "open") => STATUS_META[status] || STATUS_META.open;

const formatRelativeTime = (value) => {
	if (!value) return "Never";
	try {
		return formatDistanceToNow(new Date(value), { addSuffix: true });
	} catch {
		return "—";
	}
};

const formatDateTime = (value) => {
	if (!value) return "—";
	try {
		return format(new Date(value), "MMM d, yyyy HH:mm");
	} catch {
		return "—";
	}
};

export default function Disputes() {
	const [filters, setFilters] = useState({ status: "", page: 1, limit: 20 });
	const [disputes, setDisputes] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [selectedDispute, setSelectedDispute] = useState(null);
	const [chatMessages, setChatMessages] = useState([]);
	const chatScrollRef = useRef(null);
	const [loadingChat, setLoadingChat] = useState(false);
	const [newMessage, setNewMessage] = useState("");
	const [sendingMessage, setSendingMessage] = useState(false);

	const loadDisputes = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const params = {
				page: filters.page,
				limit: filters.limit,
			};
			if (filters.status) params.status = filters.status;

			const res = await api.get("/api/admin/disputes", { params });
			setDisputes(res.data.disputes || []);
			setPagination(res.data.pagination || { page: 1, pages: 0, total: 0 });
		} catch (err) {
			console.error("Failed to load disputes:", err);
			setError("Failed to load disputes");
		} finally {
			setLoading(false);
		}
	}, [filters]);

	useEffect(() => {
		loadDisputes();
	}, [loadDisputes]);

	const loadChat = async (dispute) => {
		if (!dispute.groupId?._id) {
			alert("No group chat found for this dispute");
			return;
		}

		setSelectedDispute(dispute);
		setLoadingChat(true);
		try {
			const res = await api.get(`/api/messages/${dispute.groupId._id}`);
			// API returns raw array (not wrapped). Fall back if structure changes.
			const msgs = Array.isArray(res.data)
				? res.data
				: (res.data.messages || []);
			// Ensure chronological order (ascending by createdAt)
			msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
			setChatMessages(msgs);
		} catch (err) {
			console.error("Failed to load chat:", err);
			alert("Failed to load chat messages");
		} finally {
			setLoadingChat(false);
		}
	};

	const sendMessage = async () => {
		if (!newMessage.trim() || !selectedDispute?.groupId?._id) return;

		setSendingMessage(true);
		try {
			const res = await api.post("/api/messages", {
				groupId: selectedDispute.groupId._id,
				text: newMessage.trim(),
			});
			// API returns created message object directly
			const created = res.data?.message || res.data; // support both shapes
			if (created) {
				setChatMessages((prev) => [...prev, created]);
			}
			setNewMessage("");
		} catch (err) {
			console.error("Failed to send message:", err);
			alert("Failed to send message");
		} finally {
			setSendingMessage(false);
		}
	};

	const updateDisputeStatus = async (disputeId, newStatus) => {
		try {
			const res = await api.patch(`/api/admin/disputes/${disputeId}/status`, {
				status: newStatus,
			});
			// Refresh disputes list
			loadDisputes();
			// Update selected dispute if it's the one being updated
			if (selectedDispute?._id === disputeId) {
				setSelectedDispute((prev) => ({ ...prev, status: newStatus }));
				// Append system message returned by server if chat open
				if (res.data?.message) {
					setChatMessages((prev) => [...prev, res.data.message]);
				}
			}
		} catch (err) {
			console.error("Failed to update dispute status:", err);
			alert("Failed to update dispute status");
		}
	};

	const dashboardStats = {
		total: pagination.total,
		open: disputes.filter((d) => d.status === "open").length,
		resolved: disputes.filter((d) => d.status === "resolved").length,
		closed: disputes.filter((d) => d.status === "closed").length,
	};

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		if (chatScrollRef.current) {
			chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
		}
	}, [chatMessages, selectedDispute]);

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
				<h2>Disputes Management</h2>
			</div>

			{/* Stats Cards */}
			<div
				className="grid cols-4"
				style={{ marginBottom: "24px" }}
			>
				<div className="card">
					<div className="small">Total Disputes</div>
					<div style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>
						{dashboardStats.total}
					</div>
				</div>
				<div className="card">
					<div className="small">Open</div>
					<div
						style={{
							fontSize: "24px",
							fontWeight: 700,
							marginTop: "8px",
							color: "#f59e0b",
						}}
					>
						{dashboardStats.open}
					</div>
				</div>
				<div className="card">
					<div className="small">Resolved</div>
					<div
						style={{
							fontSize: "24px",
							fontWeight: 700,
							marginTop: "8px",
							color: "#10b981",
						}}
					>
						{dashboardStats.resolved}
					</div>
				</div>
				<div className="card">
					<div className="small">Closed</div>
					<div
						style={{
							fontSize: "24px",
							fontWeight: 700,
							marginTop: "8px",
							color: "#6b7280",
						}}
					>
						{dashboardStats.closed}
					</div>
				</div>
			</div>

			{/* Filters */}
			<div
				className="card"
				style={{ marginBottom: "16px", padding: "12px 16px" }}
			>
				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					<span className="small">Filter:</span>
					{STATUS_FILTERS.map((f) => (
						<button
							key={f.value}
							className={filters.status === f.value ? "btn" : "btn ghost"}
							onClick={() => setFilters({ ...filters, status: f.value, page: 1 })}
							style={{ padding: "6px 12px", fontSize: "12px" }}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			{/* Disputes Table */}
			{loading && !disputes.length ? (
				<div className="loading">Loading disputes...</div>
			) : error ? (
				<div className="card">
					<p style={{ color: "var(--danger)" }}>{error}</p>
				</div>
			) : disputes.length === 0 ? (
				<div className="card">
					<p style={{ color: "var(--muted)" }}>No disputes found</p>
				</div>
			) : (
				<div className="card">
					<table className="data-table">
						<thead>
							<tr>
								<th>Order</th>
								<th>Created By</th>
								<th>Buyer</th>
								<th>Vendor</th>
								<th>Reason</th>
								<th>Status</th>
								<th>Created</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{disputes.map((dispute) => {
								const statusMeta = getStatusMeta(dispute.status);
								return (
									<tr key={dispute._id}>
										<td>
											<div style={{ fontWeight: 600 }}>
												{dispute.orderId?.orderNumber || "N/A"}
											</div>
											<div className="small">
												{dispute.orderId?.status || "—"}
											</div>
										</td>
										<td>
											<div>{dispute.createdBy?.name || "Unknown"}</div>
											<div className="small">{dispute.createdBy?.email}</div>
										</td>
										<td>
											<div>{dispute.buyerId?.name || "Unknown"}</div>
											<div className="small">{dispute.buyerId?.email}</div>
										</td>
										<td>
											<div>{dispute.vendorId?.name || "Unknown"}</div>
											<div className="small">{dispute.vendorId?.email}</div>
										</td>
										<td>
											<div
												style={{
													maxWidth: "200px",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}
												title={dispute.reason}
											>
												{dispute.reason}
											</div>
										</td>
										<td>
											<span
												className="badge"
												style={{
													background: statusMeta.bg,
													color: statusMeta.color,
													border: `1px solid ${statusMeta.color}`,
												}}
											>
												{statusMeta.label}
											</span>
										</td>
										<td>
											<div>{formatDateTime(dispute.createdAt)}</div>
											<div className="small">
												{formatRelativeTime(dispute.createdAt)}
											</div>
										</td>
										<td>
											<div style={{ display: "flex", gap: "8px" }}>
												<button
													className="btn ghost"
													onClick={() => loadChat(dispute)}
													style={{ padding: "4px 8px", fontSize: "12px" }}
												>
													View Chat
												</button>
												{dispute.status === "open" && (
													<button
														className="btn ghost"
														onClick={() =>
															updateDisputeStatus(dispute._id, "resolved")
														}
														style={{ padding: "4px 8px", fontSize: "12px" }}
													>
														Resolve
													</button>
												)}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>

					{/* Pagination */}
					{pagination.pages > 1 && (
						<div
							style={{
								marginTop: "16px",
								display: "flex",
								gap: "8px",
								justifyContent: "center",
							}}
						>
							<button
								className="btn ghost"
								disabled={filters.page === 1}
								onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
							>
								Previous
							</button>
							<span style={{ padding: "8px 16px" }}>
								Page {pagination.page} of {pagination.pages}
							</span>
							<button
								className="btn ghost"
								disabled={filters.page === pagination.pages}
								onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
							>
								Next
							</button>
						</div>
					)}
				</div>
			)}

			{/* Chat Modal */}
			{selectedDispute && (
				<div
					className="modal-overlay"
					onClick={() => setSelectedDispute(null)}
				>
					<div
						className="modal-content"
						onClick={(e) => e.stopPropagation()}
						style={{
							width: "800px",
							maxWidth: "90vw",
							height: "700px",
							maxHeight: "90vh",
							display: "flex",
							flexDirection: "column",
						}}
					>
						{/* Chat Header */}
						<div
							style={{
								padding: "16px",
								borderBottom: "1px solid var(--border)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<div>
								<h3 style={{ margin: 0 }}>
									Dispute Chat: {selectedDispute.orderId?.orderNumber || "N/A"}
								</h3>
								<div className="small">
									Group: {selectedDispute.groupId?.name || "N/A"}
								</div>
							</div>
							<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
								<span
									className="badge"
									style={{
										background: getStatusMeta(selectedDispute.status).bg,
										color: getStatusMeta(selectedDispute.status).color,
										border: `1px solid ${
											getStatusMeta(selectedDispute.status).color
										}`,
									}}
								>
									{getStatusMeta(selectedDispute.status).label}
								</span>
								<button
									className="btn ghost"
									onClick={() => setSelectedDispute(null)}
									style={{ padding: "4px 8px" }}
								>
									✕
								</button>
							</div>
						</div>

						{/* Chat Messages */}
						<div
							ref={chatScrollRef}
							style={{
								flex: 1,
								overflowY: "auto",
								padding: "16px",
								background: "var(--bg)",
							}}
						>
							{loadingChat ? (
								<div style={{ textAlign: "center", padding: "32px" }}>
									Loading messages...
								</div>
							) : chatMessages.length === 0 ? (
								<div
									style={{
										textAlign: "center",
										padding: "32px",
										color: "var(--muted)",
									}}
								>
									No messages yet
								</div>
							) : (
								chatMessages.map((msg) => (
									<div
										key={msg._id}
										style={{
											marginBottom: "16px",
											padding: "12px",
											background: "var(--card)",
											borderRadius: "8px",
											border: "1px solid var(--border)",
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												marginBottom: "8px",
											}}
										>
											<div style={{ fontWeight: 600 }}>
												{msg.sender?.name || "Unknown"}
											</div>
											<div className="small">
												{formatDateTime(msg.createdAt)}
											</div>
										</div>
										<div>{msg.text}</div>
									</div>
								))
							)}
						</div>

						{/* Message Input */}
						<div
							style={{
								padding: "16px",
								borderTop: "1px solid var(--border)",
								display: "flex",
								gap: "8px",
							}}
						>
							<input
								type="text"
								className="input"
								placeholder="Type your message..."
								value={newMessage}
								onChange={(e) => setNewMessage(e.target.value)}
								onKeyPress={(e) => {
									if (e.key === "Enter" && !sendingMessage) {
										sendMessage();
									}
								}}
								style={{ flex: 1 }}
							/>
							<button
								className="btn"
								onClick={sendMessage}
								disabled={sendingMessage || !newMessage.trim()}
							>
								{sendingMessage ? "Sending..." : "Send"}
							</button>
						</div>

						{/* Status Update Actions */}
						{selectedDispute.status === "open" && (
							<div
								style={{
									padding: "16px",
									borderTop: "1px solid var(--border)",
									background: "var(--bg-soft)",
									display: "flex",
									gap: "8px",
									justifyContent: "flex-end",
								}}
							>
								<button
									className="btn ghost"
									onClick={() => {
										updateDisputeStatus(selectedDispute._id, "resolved");
									}}
								>
									Mark as Resolved
								</button>
								<button
									className="btn ghost"
									onClick={() => {
										updateDisputeStatus(selectedDispute._id, "closed");
									}}
									style={{ color: "var(--danger)" }}
								>
									Close Dispute
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
