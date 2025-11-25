import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function IndustryUpdates() {
	const { user } = useAuth();
	const [items, setItems] = useState([]);
	const [form, setForm] = useState({
		title: "",
		summary: "",
		source: "",
		link: "",
		tags: "",
		published: true,
		publishedAt: "",
	});
	const canPost = user?.role === "admin";

	async function load() {
		const { data } = await api.get("/api/industry/updates");
		setItems(Array.isArray(data?.items) ? data.items : []);
	}

	useEffect(() => {
		load();
	}, []);

	const submit = async (e) => {
		e.preventDefault();
		if (!canPost) return;
		const payload = {
			...form,
			tags: form.tags ? form.tags.split(",").map((s) => s.trim()) : [],
		};
		if (!payload.publishedAt) delete payload.publishedAt; // let server default / normalize
		await api.post("/api/industry/updates", payload);
		setForm({
			title: "",
			summary: "",
			source: "",
			link: "",
			tags: "",
			published: true,
			publishedAt: "",
		});
		await load();
	};

	return (
		<>
			<h2>Industry Updates</h2>

			{canPost && (
				<div
					className="card"
					style={{ marginBottom: 16 }}
				>
					<form onSubmit={submit}>
						<div className="grid cols-2">
							<div className="form-row">
								<label>Title</label>
								<input
									className="input"
									value={form.title}
									onChange={(e) =>
										setForm((f) => ({ ...f, title: e.target.value }))
									}
								/>
							</div>
							<div className="form-row">
								<label>Source</label>
								<input
									className="input"
									value={form.source}
									onChange={(e) =>
										setForm((f) => ({ ...f, source: e.target.value }))
									}
								/>
							</div>
						</div>
						<div className="form-row">
							<label>Summary</label>
							<textarea
								className="input"
								rows="3"
								value={form.summary}
								onChange={(e) =>
									setForm((f) => ({ ...f, summary: e.target.value }))
								}
							/>
						</div>
						<div className="grid cols-2">
							<div className="form-row">
								<label>Link</label>
								<input
									className="input"
									value={form.link}
									onChange={(e) =>
										setForm((f) => ({ ...f, link: e.target.value }))
									}
								/>
							</div>
							<div className="form-row">
								<label>Tags (comma-separated)</label>
								<input
									className="input"
									value={form.tags}
									onChange={(e) =>
										setForm((f) => ({ ...f, tags: e.target.value }))
									}
								/>
							</div>
						</div>
						<div className="grid cols-2">
							<div className="form-row">
								<label>Published</label>
								<select
									className="input"
									value={form.published}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											published: e.target.value === "true",
										}))
									}
								>
									<option value="true">true</option>
									<option value="false">false</option>
								</select>
							</div>
							<div className="form-row">
								<label>
									Published At (optional ISO; leave blank to default)
								</label>
								<input
									className="input"
									placeholder="2025-10-07T05:00:00.000Z"
									value={form.publishedAt}
									onChange={(e) =>
										setForm((f) => ({ ...f, publishedAt: e.target.value }))
									}
								/>
							</div>
						</div>
						<button
							className="btn"
							type="submit"
						>
							Create / Update
						</button>
					</form>
				</div>
			)}

			<div className="grid">
				{items.map((u, i) => (
					<div
						key={i}
						className="card"
					>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<div>
								<strong>{u.title}</strong>
								<div className="small">
									{u.source} •{" "}
									{u.publishedAt
										? new Date(u.publishedAt).toLocaleString()
										: "-"}
								</div>
							</div>
							<span className="badge">
								{u.published ? "Published" : "Draft"}
							</span>
						</div>
						<p style={{ marginTop: 8 }}>{u.summary}</p>
						{u.link ? (
							<a
								href={u.link}
								target="_blank"
								rel="noreferrer"
							>
								Open link →
							</a>
						) : null}
						{u.tags?.length ? (
							<div
								className="small"
								style={{ marginTop: 8 }}
							>
								Tags: {u.tags.join(", ")}
							</div>
						) : null}
					</div>
				))}
			</div>
		</>
	);
}
