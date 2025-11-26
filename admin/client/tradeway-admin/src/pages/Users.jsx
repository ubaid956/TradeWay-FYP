import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import api from "../lib/api";

const ROLE_FILTERS = [
	{ label: "All roles", value: "" },
	{ label: "Buyers", value: "buyer" },
	{ label: "Vendors", value: "vendor" },
	{ label: "Drivers", value: "driver" },
];

const SORT_OPTIONS = [
	{ label: "Newest", value: "-createdAt" },
	{ label: "Last Active", value: "-lastActive" },
	{ label: "Oldest", value: "createdAt" },
	{ label: "Name A→Z", value: "name" },
	{ label: "Name Z→A", value: "-name" },
];

const DRIVER_STATUSES = [
	{ label: "Unverified", value: "unverified" },
	{ label: "Pending", value: "pending" },
	{ label: "Verified", value: "verified" },
	{ label: "Rejected", value: "rejected" },
];

const HIDDEN_ROLES = new Set(["admin"]);

const shouldHideRole = (role) => HIDDEN_ROLES.has((role || "").toLowerCase());

const ROLE_META = {
	buyer: {
		label: "Buyer",
		color: "#2f80ed",
		bg: "rgba(47,128,237,0.16)",
		avatarBg: "rgba(47,128,237,0.32)",
	},
	vendor: {
		label: "Vendor",
		color: "#27ae60",
		bg: "rgba(39,174,96,0.16)",
		avatarBg: "rgba(39,174,96,0.28)",
	},
	driver: {
		label: "Driver",
		color: "#f2994a",
		bg: "rgba(242,153,74,0.16)",
		avatarBg: "rgba(242,153,74,0.26)",
	},
	admin: {
		label: "Admin",
		color: "#bb6bd9",
		bg: "rgba(187,107,217,0.2)",
		avatarBg: "rgba(187,107,217,0.32)",
	},
	default: {
		label: "User",
		color: "#6b7280",
		bg: "rgba(107,114,128,0.2)",
		avatarBg: "rgba(107,114,128,0.35)",
	},
};

const DRIVER_STATUS_META = {
	unverified: {
		label: "Unverified driver",
		color: "#9ca3af",
		bg: "rgba(156,163,175,0.2)",
	},
	pending: {
		label: "Driver pending",
		color: "#c77800",
		bg: "rgba(199,120,0,0.2)",
	},
	verified: {
		label: "Driver verified",
		color: "#15803d",
		bg: "rgba(21,128,61,0.2)",
	},
	rejected: {
		label: "Driver rejected",
		color: "#b91c1c",
		bg: "rgba(185,28,28,0.2)",
	},
};

const getInitials = (name = "User") => {
	const parts = name.trim().split(" ").filter(Boolean);
	if (!parts.length) return (name[0] || "U").toUpperCase();
	const [first, second] = parts;
	return (first[0] + (second?.[0] || "")).toUpperCase();
};

const getRoleMeta = (role = "default") => ROLE_META[role] || ROLE_META.default;

const getDriverStatusMeta = (status = "unverified") =>
	DRIVER_STATUS_META[status] || DRIVER_STATUS_META.unverified;

const formatRelativeTime = (value) => {
	if (!value) return "Never";
	try {
		return formatDistanceToNow(new Date(value), { addSuffix: true });
	} catch {
		return "—";
	}
};

const isRecentlyActive = (lastActive) => {
	if (!lastActive) return false;
	const last = new Date(lastActive).getTime();
	if (Number.isNaN(last)) return false;
	const sevenDays = 7 * 24 * 60 * 60 * 1000;
	return Date.now() - last <= sevenDays;
};

const formatDate = (value) => {
	if (!value) return "—";
	try {
		return format(new Date(value), "MMM d, yyyy");
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

const numberDisplay = (value) =>
	typeof value === "number" ? value.toLocaleString() : value ?? "0";

export default function Users() {
	const [filters, setFilters] = useState({
		search: "",
		role: "",
		sort: "-createdAt",
		page: 1,
		limit: 20,
	});
	const [searchInput, setSearchInput] = useState("");
	const [users, setUsers] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [usersError, setUsersError] = useState("");

	const [selectedUserId, setSelectedUserId] = useState(null);
	const [activity, setActivity] = useState(null);
	const [activityLoading, setActivityLoading] = useState(false);
	const [activityError, setActivityError] = useState("");

	const [editForm, setEditForm] = useState(null);
	const [productDrafts, setProductDrafts] = useState({});
	const [actionState, setActionState] = useState({
		type: null,
		targetId: null,
	});

	const dashboardStats = useMemo(() => {
		if (!users.length) {
			return null;
		}
		const totalUsers = pagination.total || users.length;
		const roleCounts = users.reduce((acc, user) => {
			const role = user.role || "default";
			acc[role] = (acc[role] || 0) + 1;
			return acc;
		}, {});
		const recentlyActive = users.filter((user) =>
			isRecentlyActive(user.lastActive)
		).length;
		const totalListings = users.reduce(
			(sum, user) => sum + (user.activitySummary?.products?.total || 0),
			0
		);
		const sellerCount =
			users.filter((user) => user.role === "vendor").length || 1;
		const averageListings = Math.round((totalListings / sellerCount) * 10) / 10;
		const verifiedKyc = users.filter((user) =>
			Boolean(user.isKYCVerified)
		).length;
		return {
			totalUsers,
			recentlyActive,
			averageListings,
			verifiedKyc,
			roleCounts,
		};
	}, [users, pagination.total]);

	useEffect(() => {
		const handle = setTimeout(() => {
			setFilters((prev) => {
				const trimmed = searchInput.trim();
				if (prev.search === trimmed) return prev;
				return { ...prev, search: trimmed, page: 1 };
			});
		}, 350);
		return () => clearTimeout(handle);
	}, [searchInput]);

	const fetchUsers = useCallback(async () => {
		try {
			setLoadingUsers(true);
			setUsersError("");
			const { data } = await api.get("/api/admin/users", { params: filters });
			const incomingUsers = data?.data || [];
			const visibleUsers = incomingUsers.filter(
				(user) => !shouldHideRole(user.role)
			);
			const hiddenCount = incomingUsers.length - visibleUsers.length;
			setUsers(visibleUsers);
			const rawPagination = data?.pagination;
			if (rawPagination) {
				const limitValue = rawPagination.limit || filters.limit || 20;
				const adjustedTotal = Math.max(
					0,
					(rawPagination.total ?? visibleUsers.length) - hiddenCount
				);
				const adjustedPages =
					limitValue > 0
						? Math.ceil(adjustedTotal / limitValue) || 0
						: rawPagination.pages || 0;
				setPagination({
					...rawPagination,
					total: adjustedTotal,
					pages: adjustedPages,
					limit: limitValue,
				});
			} else {
				setPagination({
					page: filters.page,
					pages:
						filters.limit > 0
							? Math.ceil(visibleUsers.length / filters.limit) || 0
							: 0,
					total: visibleUsers.length,
					limit: filters.limit,
				});
			}
		} catch (error) {
			console.error("Failed to load users:", error);
			setUsersError(error?.response?.data?.message || "Failed to load users");
		} finally {
			setLoadingUsers(false);
		}
	}, [filters]);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	const fetchActivity = useCallback(async (userId) => {
		if (!userId) return;
		try {
			setActivityLoading(true);
			setActivityError("");
			const { data } = await api.get(`/api/admin/users/${userId}/activity`);
			const payload = data?.data;
			setActivity(payload);
			setEditForm({
				name: payload?.user?.name || "",
				email: payload?.user?.email || "",
				phone: payload?.user?.phone || "",
				role: payload?.user?.role || "buyer",
				bio: payload?.user?.bio || "",
				location: payload?.user?.location || "",
				language: payload?.user?.language || "en",
				isKYCVerified: Boolean(payload?.user?.isKYCVerified),
				driverVerificationStatus:
					payload?.user?.driverProfile?.verificationStatus || "unverified",
			});
			const drafts = {};
			(payload?.products || []).forEach((product) => {
				drafts[product._id] = {
					price: product.price ?? 0,
					quantity: product.quantity ?? 0,
				};
			});
			setProductDrafts(drafts);
		} catch (error) {
			console.error("Failed to load user activity:", error);
			setActivityError(
				error?.response?.data?.message || "Failed to load user activity"
			);
		} finally {
			setActivityLoading(false);
		}
	}, []);

	const handleSelectUser = useCallback(
		(userId) => {
			if (userId === selectedUserId) return;
			setSelectedUserId(userId);
			setActivity(null);
			fetchActivity(userId);
		},
		[selectedUserId, fetchActivity]
	);

	const currentPage = pagination.page || filters.page;
	const totalPages = pagination.pages || 1;
	const canGoPrev = currentPage > 1;
	const canGoNext = totalPages > currentPage;

	const updateFilter = (key, value) => {
		setFilters((prev) => ({
			...prev,
			[key]: key === "page" ? Math.max(1, value) : value,
			page: key === "page" ? Math.max(1, value) : 1,
		}));
	};

	const handleEditChange = (field, value) => {
		setEditForm((prev) => ({ ...prev, [field]: value }));
	};

	const buildUserPayload = useCallback(() => {
		if (!activity?.user || !editForm) return {};
		const payload = {};
		const base = activity.user;
		const fields = [
			"name",
			"email",
			"phone",
			"role",
			"bio",
			"location",
			"language",
			"isKYCVerified",
		];
		fields.forEach((field) => {
			if (editForm[field] !== undefined && editForm[field] !== base[field]) {
				payload[field] = editForm[field];
			}
		});
		const driverStatus =
			base?.driverProfile?.verificationStatus || "unverified";
		if (
			editForm.driverVerificationStatus &&
			editForm.driverVerificationStatus !== driverStatus
		) {
			payload.driverProfile = {
				verificationStatus: editForm.driverVerificationStatus,
			};
		}
		return payload;
	}, [activity, editForm]);

	const handleSaveUser = async () => {
		if (!selectedUserId) return;
		const payload = buildUserPayload();
		if (!Object.keys(payload).length) return;
		try {
			setActionState({ type: "user-save", targetId: selectedUserId });
			await api.patch(`/api/admin/users/${selectedUserId}`, payload);
			await Promise.all([fetchUsers(), fetchActivity(selectedUserId)]);
		} catch (error) {
			console.error("Failed to update user:", error);
			alert(error?.response?.data?.message || "Failed to update user");
		} finally {
			setActionState({ type: null, targetId: null });
		}
	};

	const handleDeleteUser = async () => {
		if (!selectedUserId) return;
		if (!window.confirm("Delete this user and their related records?")) return;
		try {
			setActionState({ type: "user-delete", targetId: selectedUserId });
			await api.delete(`/api/admin/users/${selectedUserId}`);
			setSelectedUserId(null);
			setActivity(null);
			await fetchUsers();
		} catch (error) {
			console.error("Failed to delete user:", error);
			alert(error?.response?.data?.message || "Failed to delete user");
		} finally {
			setActionState({ type: null, targetId: null });
		}
	};

	const updateProductDraft = (productId, field, value) => {
		setProductDrafts((prev) => ({
			...prev,
			[productId]: {
				...prev[productId],
				[field]: value,
			},
		}));
	};

	const handleSaveProduct = async (product) => {
		if (!product?._id) return;
		const draft = productDrafts[product._id];
		const payload = {};
		if (draft?.price !== undefined && draft.price !== product.price) {
			payload.price = Number(draft.price);
		}
		if (draft?.quantity !== undefined && draft.quantity !== product.quantity) {
			payload.quantity = Number(draft.quantity);
		}
		if (!Object.keys(payload).length) return;
		try {
			setActionState({ type: "product-save", targetId: product._id });
			await api.patch(`/api/admin/products/${product._id}`, payload);
			await Promise.all([fetchUsers(), fetchActivity(selectedUserId)]);
		} catch (error) {
			console.error("Failed to update product:", error);
			alert(error?.response?.data?.message || "Failed to update product");
		} finally {
			setActionState({ type: null, targetId: null });
		}
	};

	const handleToggleProduct = async (product) => {
		if (!product?._id) return;
		try {
			setActionState({ type: "product-toggle", targetId: product._id });
			await api.patch(`/api/admin/products/${product._id}`, {
				isActive: !product.isActive,
			});
			await Promise.all([fetchUsers(), fetchActivity(selectedUserId)]);
		} catch (error) {
			console.error("Failed to toggle product:", error);
			alert(error?.response?.data?.message || "Failed to toggle product");
		} finally {
			setActionState({ type: null, targetId: null });
		}
	};

	const handleDeleteProduct = async (productId) => {
		if (!productId) return;
		if (
			!window.confirm("Delete this product? This also removes associated bids.")
		)
			return;
		try {
			setActionState({ type: "product-delete", targetId: productId });
			await api.delete(`/api/admin/products/${productId}`);
			await Promise.all([fetchUsers(), fetchActivity(selectedUserId)]);
		} catch (error) {
			console.error("Failed to delete product:", error);
			alert(error?.response?.data?.message || "Failed to delete product");
		} finally {
			setActionState({ type: null, targetId: null });
		}
	};

	const hasProductChange = (product) => {
		const draft = productDrafts[product._id];
		if (!draft) return false;
		return draft.price !== product.price || draft.quantity !== product.quantity;
	};

	const userTable = useMemo(() => {
		if (loadingUsers) {
			return <div style={{ padding: 16 }}>Loading users…</div>;
		}
		if (usersError) {
			return (
				<div style={{ padding: 16, color: "var(--danger, #b3261e)" }}>
					{usersError}
				</div>
			);
		}
		if (!users.length) {
			return <div style={{ padding: 16 }}>No users found.</div>;
		}
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				{users.map((user) => {
					const selected = user._id === selectedUserId;
					const roleMeta = getRoleMeta(user.role);
					const driverStatus =
						user?.driverProfile?.verificationStatus || "unverified";
					const driverMeta = getDriverStatusMeta(driverStatus);
					const summary = user.activitySummary || {};
					const recentlyActive = isRecentlyActive(user.lastActive);
					const cardStyle = {
						...userCardBaseStyle,
						borderColor: selected ? roleMeta.color : "var(--border)",
						boxShadow: selected
							? `0 0 0 1px ${roleMeta.bg}, 0 12px 24px rgba(0,0,0,0.2)`
							: "none",
						background: selected
							? "var(--cardAlt, rgba(255,255,255,0.06))"
							: "rgba(255,255,255,0.01)",
					};
					return (
						<div
							key={user._id}
							role="button"
							tabIndex={0}
							onClick={() => handleSelectUser(user._id)}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									handleSelectUser(user._id);
								}
							}}
							style={cardStyle}
						>
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: 16,
									justifyContent: "space-between",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 12,
										flex: "1 1 260px",
									}}
								>
									<div
										style={{
											width: 48,
											height: 48,
											borderRadius: "50%",
											background: roleMeta.avatarBg,
											color: "#fff",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontWeight: 600,
											fontSize: 16,
										}}
									>
										{getInitials(user.name || user.email || "User")}
									</div>
									<div>
										<div style={{ fontWeight: 600, fontSize: 16 }}>
											{user.name || "Unnamed"}
										</div>
										<div
											className="small"
											style={{ color: "var(--muted)" }}
										>
											{user.email || "—"}
										</div>
										{user.phone && (
											<div
												className="small"
												style={{ color: "var(--muted)" }}
											>
												{user.phone}
											</div>
										)}
									</div>
								</div>
								<div
									style={{
										display: "flex",
										gap: 8,
										flexWrap: "wrap",
										alignItems: "center",
										flex: "1 1 220px",
									}}
								>
									<span
										style={{
											...pillBaseStyle,
											color: roleMeta.color,
											background: roleMeta.bg,
										}}
									>
										{roleMeta.label}
									</span>
									{recentlyActive && (
										<span
											style={{
												...pillBaseStyle,
												color: "#059669",
												background: "rgba(5,150,105,0.18)",
											}}
										>
											Active now
										</span>
									)}
									{user.isKYCVerified && (
										<span
											style={{
												...pillBaseStyle,
												color: "#0f8a00",
												background: "rgba(15,138,0,0.18)",
											}}
										>
											KYC verified
										</span>
									)}
									{user.role === "driver" && (
										<span
											style={{
												...pillBaseStyle,
												color: driverMeta.color,
												background: driverMeta.bg,
											}}
										>
											{driverMeta.label}
										</span>
									)}
								</div>
								<div
									style={{
										minWidth: 160,
										textAlign: "right",
										flex: "0 0 auto",
									}}
								>
									<div
										className="small"
										style={{ color: "var(--muted)" }}
									>
										Last active
									</div>
									<div>{formatRelativeTime(user.lastActive)}</div>
									<div
										className="small"
										style={{ color: "var(--muted)" }}
									>
										Joined {formatDate(user.createdAt)}
									</div>
								</div>
							</div>
							<div style={listStatsGridStyle}>
								<div style={listStatStyle}>
									<div className="small">Products</div>
									<div className="stat">
										{numberDisplay(summary?.products?.total || 0)}
									</div>
									<div
										className="small"
										style={{ color: "var(--muted)" }}
									>
										Active {numberDisplay(summary?.products?.active || 0)}
									</div>
								</div>
								<div style={listStatStyle}>
									<div className="small">Bids placed</div>
									<div className="stat">
										{numberDisplay(summary?.bidsPlaced || 0)}
									</div>
								</div>
								<div style={listStatStyle}>
									<div className="small">Proposals received</div>
									<div className="stat">
										{numberDisplay(summary?.proposalsReceived || 0)}
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		);
	}, [loadingUsers, users, usersError, selectedUserId, handleSelectUser]);

	const renderDetailPanel = () => {
		if (!selectedUserId) {
			return <div>Select a user to inspect their activity.</div>;
		}
		if (activityLoading) {
			return <div>Loading activity…</div>;
		}
		if (activityError) {
			return (
				<div style={{ color: "var(--danger, #b3261e)" }}>{activityError}</div>
			);
		}
		if (!activity || !editForm) {
			return <div>Choose a user to load their profile and activity.</div>;
		}
		const summary = activity.summary;
		const user = activity.user || {};
		const roleMeta = getRoleMeta(user.role);
		const driverStatus =
			user?.driverProfile?.verificationStatus || "unverified";
		const driverMeta = getDriverStatusMeta(driverStatus);
		const recentlyActive = isRecentlyActive(user.lastActive);
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<section style={detailHeroStyle}>
					<div style={{ display: "flex", gap: 12, flex: "1 1 60%" }}>
						<div
							style={{
								width: 60,
								height: 60,
								borderRadius: "50%",
								background: roleMeta.avatarBg,
								color: "#fff",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 20,
								fontWeight: 600,
							}}
						>
							{getInitials(user.name || user.email || "User")}
						</div>
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: 20, fontWeight: 600 }}>
								{user.name || "Unnamed user"}
							</div>
							<div
								className="small"
								style={{ color: "var(--muted)" }}
							>
								{user.email || "No email on file"}
							</div>
							{user.phone && (
								<div
									className="small"
									style={{ color: "var(--muted)" }}
								>
									{user.phone}
								</div>
							)}
							<div style={chipRowStyle}>
								<span
									style={{
										...pillBaseStyle,
										color: roleMeta.color,
										background: roleMeta.bg,
									}}
								>
									{roleMeta.label}
								</span>
								{user.role === "driver" && (
									<span
										style={{
											...pillBaseStyle,
											color: driverMeta.color,
											background: driverMeta.bg,
										}}
									>
										{driverMeta.label}
									</span>
								)}
								{user.isKYCVerified && (
									<span
										style={{
											...pillBaseStyle,
											color: "#0f8a00",
											background: "rgba(15,138,0,0.18)",
										}}
									>
										KYC verified
									</span>
								)}
								{recentlyActive && (
									<span
										style={{
											...pillBaseStyle,
											color: "#059669",
											background: "rgba(5,150,105,0.18)",
										}}
									>
										Active now
									</span>
								)}
							</div>
						</div>
					</div>
					<div style={{ textAlign: "right", minWidth: 180 }}>
						<div
							className="small"
							style={{ color: "var(--muted)" }}
						>
							Last active
						</div>
						<div>{formatRelativeTime(user.lastActive)}</div>
						<div
							className="small"
							style={{ color: "var(--muted)" }}
						>
							User since {formatDate(user.createdAt)}
						</div>
						<div
							className="small"
							style={{ color: "var(--muted)" }}
						>
							Location · {user.location || "Not provided"}
						</div>
					</div>
				</section>

				<section style={detailSectionStyle}>
					<div style={sectionHeaderStyle}>
						<h4 style={{ margin: 0 }}>Account snapshot</h4>
						<span
							className="small"
							style={{ color: "var(--muted)" }}
						>
							Live metrics
						</span>
					</div>
					<div style={detailStatsGridStyle}>
						<div style={metricStyle}>
							<div className="small">Products</div>
							<div className="stat">
								{numberDisplay(summary?.products?.total || 0)}
							</div>
							<div
								className="small"
								style={{ color: "var(--muted)" }}
							>
								Active {numberDisplay(summary?.products?.active || 0)}
							</div>
						</div>
						<div style={metricStyle}>
							<div className="small">Bids placed</div>
							<div className="stat">
								{numberDisplay(summary?.bidsPlaced || 0)}
							</div>
						</div>
						<div style={metricStyle}>
							<div className="small">Proposals received</div>
							<div className="stat">
								{numberDisplay(summary?.proposalsReceived || 0)}
							</div>
						</div>
					</div>
				</section>

				<section style={detailSectionStyle}>
					<div style={sectionHeaderStyle}>
						<h4 style={{ margin: 0 }}>Profile & access</h4>
						<span
							className="small"
							style={{ color: "var(--muted)" }}
						>
							Edit core user fields
						</span>
					</div>
					<div
						className="grid cols-2"
						style={{ gap: 12 }}
					>
						<div>
							<div className="small">Name</div>
							<input
								className="input"
								value={editForm.name}
								onChange={(e) => handleEditChange("name", e.target.value)}
							/>
						</div>
						<div>
							<div className="small">Email</div>
							<input
								className="input"
								value={editForm.email}
								onChange={(e) => handleEditChange("email", e.target.value)}
							/>
						</div>
						<div>
							<div className="small">Phone</div>
							<input
								className="input"
								value={editForm.phone}
								onChange={(e) => handleEditChange("phone", e.target.value)}
							/>
						</div>
						<div>
							<div className="small">Role</div>
							<select
								className="input"
								value={editForm.role}
								onChange={(e) => handleEditChange("role", e.target.value)}
							>
								{ROLE_FILTERS.filter((option) => option.value).map((option) => (
									<option
										key={option.value}
										value={option.value}
									>
										{option.label.slice(0, -1)}
									</option>
								))}
							</select>
						</div>
						<div>
							<div className="small">Location</div>
							<input
								className="input"
								value={editForm.location}
								onChange={(e) => handleEditChange("location", e.target.value)}
							/>
						</div>
						<div>
							<div className="small">Language</div>
							<input
								className="input"
								value={editForm.language}
								onChange={(e) => handleEditChange("language", e.target.value)}
							/>
						</div>
						<div>
							<div className="small">Driver status</div>
							<select
								className="input"
								value={editForm.driverVerificationStatus}
								onChange={(e) =>
									handleEditChange("driverVerificationStatus", e.target.value)
								}
							>
								{DRIVER_STATUSES.map((status) => (
									<option
										key={status.value}
										value={status.value}
									>
										{status.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<div className="small">KYC verified</div>
							<label style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<input
									type="checkbox"
									checked={Boolean(editForm.isKYCVerified)}
									onChange={(e) =>
										handleEditChange("isKYCVerified", e.target.checked)
									}
								/>
								<span>{editForm.isKYCVerified ? "Yes" : "No"}</span>
							</label>
						</div>
						<div style={{ gridColumn: "1 / span 2" }}>
							<div className="small">Bio</div>
							<textarea
								className="input"
								rows={3}
								value={editForm.bio}
								onChange={(e) => handleEditChange("bio", e.target.value)}
							/>
						</div>
					</div>
					<div style={{ display: "flex", gap: 12, marginTop: 12 }}>
						<button
							className="button"
							disabled={
								actionState.type === "user-save" ||
								!Object.keys(buildUserPayload()).length
							}
							onClick={handleSaveUser}
						>
							{actionState.type === "user-save" ? "Saving…" : "Save changes"}
						</button>
						<button
							className="button"
							style={{ background: "var(--danger, #b3261e)", color: "#fff" }}
							disabled={actionState.type === "user-delete"}
							onClick={handleDeleteUser}
						>
							{actionState.type === "user-delete" ? "Deleting…" : "Delete user"}
						</button>
					</div>
				</section>

				<section style={detailSectionStyle}>
					<h4 style={{ marginBottom: 8 }}>Uploaded products</h4>
					{!activity.products?.length ? (
						<div
							className="small"
							style={{ color: "var(--muted)" }}
						>
							No products uploaded.
						</div>
					) : (
						<div style={{ overflowX: "auto" }}>
							<table className="table">
								<thead>
									<tr>
										<th>Title</th>
										<th>Price</th>
										<th>Quantity</th>
										<th>Status</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{activity.products.map((product) => {
										const busy = actionState.targetId === product._id;
										return (
											<tr key={product._id}>
												<td>{product.title}</td>
												<td>
													<input
														className="input"
														type="number"
														min="0"
														value={
															productDrafts[product._id]?.price ??
															product.price ??
															0
														}
														onChange={(e) =>
															updateProductDraft(
																product._id,
																"price",
																e.target.value
															)
														}
														style={{ width: 110 }}
													/>
												</td>
												<td>
													<input
														className="input"
														type="number"
														min="0"
														value={
															productDrafts[product._id]?.quantity ??
															product.quantity ??
															0
														}
														onChange={(e) =>
															updateProductDraft(
																product._id,
																"quantity",
																e.target.value
															)
														}
														style={{ width: 90 }}
													/>
												</td>
												<td>
													<span
														className="small"
														style={{
															color: product.isActive
																? "var(--success, #1a7f37)"
																: "var(--muted)",
														}}
													>
														{product.isActive ? "Active" : "Inactive"}
													</span>
													{product.isSold && <div className="small">Sold</div>}
												</td>
												<td style={{ display: "flex", gap: 8 }}>
													<button
														className="button"
														disabled={busy || !hasProductChange(product)}
														onClick={() => handleSaveProduct(product)}
													>
														Save
													</button>
													<button
														className="button"
														disabled={busy}
														onClick={() => handleToggleProduct(product)}
													>
														{product.isActive ? "Deactivate" : "Activate"}
													</button>
													<button
														className="button"
														style={{
															background: "var(--danger, #b3261e)",
															color: "#fff",
														}}
														disabled={busy}
														onClick={() => handleDeleteProduct(product._id)}
													>
														Delete
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<section style={detailSectionStyle}>
					<h4 style={{ marginBottom: 8 }}>Bids placed</h4>
					{!activity.bids?.length ? (
						<div
							className="small"
							style={{ color: "var(--muted)" }}
						>
							No bids yet.
						</div>
					) : (
						<div style={{ overflowX: "auto" }}>
							<table className="table">
								<thead>
									<tr>
										<th>Product</th>
										<th>Amount</th>
										<th>Quantity</th>
										<th>Status</th>
										<th>Updated</th>
									</tr>
								</thead>
								<tbody>
									{activity.bids.map((bid) => (
										<tr key={bid._id}>
											<td>{bid.product?.title || "Product"}</td>
											<td>{numberDisplay(bid.bidAmount)}</td>
											<td>{numberDisplay(bid.quantity)}</td>
											<td style={{ textTransform: "capitalize" }}>
												{bid.status}
											</td>
											<td>{formatDateTime(bid.updatedAt || bid.createdAt)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<section style={detailSectionStyle}>
					<h4 style={{ marginBottom: 8 }}>Proposals on their products</h4>
					{!activity.proposals?.length ? (
						<div
							className="small"
							style={{ color: "var(--muted)" }}
						>
							No proposals yet.
						</div>
					) : (
						<div style={{ overflowX: "auto" }}>
							<table className="table">
								<thead>
									<tr>
										<th>Buyer</th>
										<th>Product</th>
										<th>Offer</th>
										<th>Status</th>
										<th>Submitted</th>
									</tr>
								</thead>
								<tbody>
									{activity.proposals.map((proposal) => (
										<tr key={proposal._id}>
											<td>
												{proposal.bidder?.name ||
													proposal.bidder?.email ||
													"Buyer"}
											</td>
											<td>{proposal.product?.title || "—"}</td>
											<td>
												{numberDisplay(proposal.bidAmount)} · Qty{" "}
												{numberDisplay(proposal.quantity)}
											</td>
											<td style={{ textTransform: "capitalize" }}>
												{proposal.status}
											</td>
											<td>{formatDateTime(proposal.createdAt)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</div>
		);
	};

	return (
		<>
			<h2>Users</h2>
			{dashboardStats && (
				<div
					className="card"
					style={{ marginBottom: 16 }}
				>
					<div
						className="grid cols-4"
						style={{ gap: 12 }}
					>
						<div style={statCardStyle}>
							<div className="small">Total users</div>
							<div className="stat">
								{numberDisplay(dashboardStats.totalUsers)}
							</div>
							<div
								className="small"
								style={{ color: "var(--muted)" }}
							>
								{numberDisplay(dashboardStats.roleCounts.vendor || 0)} vendors •{" "}
								{numberDisplay(dashboardStats.roleCounts.driver || 0)} drivers
							</div>
						</div>
						<div style={statCardStyle}>
							<div className="small">Active this week</div>
							<div className="stat">
								{numberDisplay(dashboardStats.recentlyActive)}
							</div>
							<div
								className="small"
								style={{ color: "var(--muted)" }}
							>
								{(
									(dashboardStats.recentlyActive / dashboardStats.totalUsers) *
									100
								).toFixed(0)}
								% of users
							</div>
						</div>
						<div style={statCardStyle}>
							<div className="small">Avg listings / vendor</div>
							<div className="stat">
								{numberDisplay(dashboardStats.averageListings)}
							</div>
							<div
								className="small"
								style={{ color: "var(--muted)" }}
							>
								Across active vendors
							</div>
						</div>
						<div style={statCardStyle}>
							<div className="small">Verified KYC</div>
							<div className="stat">
								{numberDisplay(dashboardStats.verifiedKyc)}
							</div>
							<div
								className="small"
								style={{ color: "var(--muted)" }}
							>
								{(
									(dashboardStats.verifiedKyc / dashboardStats.totalUsers) *
									100
								).toFixed(0)}
								% verified
							</div>
						</div>
					</div>
				</div>
			)}
			<div className="card">
				<div
					className="grid cols-4"
					style={{ gap: 12 }}
				>
					<div>
						<div className="small">Search</div>
						<input
							className="input"
							placeholder="Search by name, email, or phone"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
						/>
					</div>
					<div>
						<div className="small">Role</div>
						<select
							className="input"
							value={filters.role}
							onChange={(e) => updateFilter("role", e.target.value)}
						>
							{ROLE_FILTERS.map((option) => (
								<option
									key={option.value}
									value={option.value}
								>
									{option.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<div className="small">Sort</div>
						<select
							className="input"
							value={filters.sort}
							onChange={(e) => updateFilter("sort", e.target.value)}
						>
							{SORT_OPTIONS.map((option) => (
								<option
									key={option.value}
									value={option.value}
								>
									{option.label}
								</option>
							))}
						</select>
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "flex-end",
							justifyContent: "flex-end",
						}}
					>
						<button
							className="button"
							disabled={loadingUsers}
							onClick={fetchUsers}
						>
							{loadingUsers ? "Refreshing…" : "Refresh"}
						</button>
					</div>
				</div>
			</div>

			<div
				className="grid cols-2"
				style={{ gap: 16, alignItems: "stretch" }}
			>
				<div
					className="card"
					style={splitPaneCardStyle}
				>
					<div style={splitPaneScrollAreaStyle}>{userTable}</div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginTop: 12,
						}}
					>
						<button
							className="button"
							disabled={!canGoPrev}
							onClick={() => updateFilter("page", currentPage - 1)}
						>
							Previous
						</button>
						<div
							className="small"
							style={{ alignSelf: "center" }}
						>
							Page {currentPage} of {totalPages || 1} •{" "}
							{numberDisplay(pagination.total)} users
						</div>
						<button
							className="button"
							disabled={!canGoNext}
							onClick={() => updateFilter("page", currentPage + 1)}
						>
							Next
						</button>
					</div>
				</div>
				<div
					className="card"
					style={splitPaneCardStyle}
				>
					<div style={splitPaneScrollAreaStyle}>{renderDetailPanel()}</div>
				</div>
			</div>
		</>
	);
}

const metricStyle = {
	border: "1px solid var(--border)",
	borderRadius: 8,
	padding: 12,
	background: "var(--cardAlt, rgba(255,255,255,0.02))",
};

const statCardStyle = {
	border: "1px solid var(--border)",
	borderRadius: 10,
	padding: 16,
	background: "var(--cardAlt, rgba(255,255,255,0.02))",
};

const userCardBaseStyle = {
	border: "1px solid var(--border)",
	borderRadius: 12,
	padding: 16,
	display: "flex",
	flexDirection: "column",
	gap: 12,
	cursor: "pointer",
	transition: "border 120ms ease, box-shadow 120ms ease, transform 120ms ease",
};

const pillBaseStyle = {
	fontSize: 12,
	fontWeight: 600,
	padding: "2px 10px",
	borderRadius: 999,
	textTransform: "capitalize",
	background: "rgba(255,255,255,0.05)",
};

const listStatsGridStyle = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
	gap: 12,
};

const listStatStyle = {
	border: "1px solid var(--border)",
	borderRadius: 10,
	padding: 12,
	background: "var(--cardAlt, rgba(255,255,255,0.02))",
};

const detailHeroStyle = {
	border: "1px solid var(--border)",
	borderRadius: 12,
	padding: 16,
	background: "var(--cardAlt, rgba(255,255,255,0.03))",
	display: "flex",
	flexWrap: "wrap",
	gap: 16,
	justifyContent: "space-between",
};

const chipRowStyle = {
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
	marginTop: 8,
};

const detailSectionStyle = {
	border: "1px solid var(--border)",
	borderRadius: 12,
	padding: 16,
	background: "var(--cardAlt, rgba(255,255,255,0.02))",
};

const sectionHeaderStyle = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	marginBottom: 12,
};

const detailStatsGridStyle = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
	gap: 12,
};

const splitPaneCardStyle = {
	display: "flex",
	flexDirection: "column",
	minHeight: 420,
	maxHeight: "calc(100vh - 240px)",
};

const splitPaneScrollAreaStyle = {
	flex: 1,
	overflowY: "auto",
	paddingRight: 4,
	scrollbarGutter: "stable",
};
