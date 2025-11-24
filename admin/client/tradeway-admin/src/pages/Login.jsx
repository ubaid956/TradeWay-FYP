import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
	const { login } = useAuth();
	const nav = useNavigate();
	const [email, setEmail] = useState("admin@tradeway.com");
	const [password, setPassword] = useState("admin123");
	const [err, setErr] = useState("");

	const onSubmit = async (e) => {
		e.preventDefault();
		setErr("");
		try {
			await login(email, password);
			nav("/");
		} catch (e) {
			setErr(e.message || "Login failed");
		}
	};

	return (
		<div style={{ display: "grid", placeItems: "center", height: "100%" }}>
			<div
				className="card"
				style={{ width: 360 }}
			>
				<h2>Admin Login</h2>
				<p className="small">Use seeded credentials.</p>
				{err ? <p style={{ color: "#ff8b8b" }}>{err}</p> : null}
				<form onSubmit={onSubmit}>
					<div className="form-row">
						<label>Email</label>
						<input
							className="input"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>
					<div className="form-row">
						<label>Password</label>
						<input
							className="input"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<button
						className="btn"
						type="submit"
						style={{ width: "100%" }}
					>
						Login
					</button>
				</form>
			</div>
		</div>
	);
}
