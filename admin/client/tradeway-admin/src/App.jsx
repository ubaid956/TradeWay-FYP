import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import PriceIndex from "./pages/PriceIndex";
import Forecasts from "./pages/Forecasts";
import Sellers from "./pages/Sellers";
import IndustryUpdates from "./pages/IndustryUpdates";
import Login from "./pages/Login";

export default function App() {
	const [theme, setTheme] = useState(() =>
		localStorage.getItem("tw-theme") === "light" ? "light" : "dark"
	);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("tw-theme", theme);
	}, [theme]);

	const toggleTheme = () =>
		setTheme((prev) => (prev === "dark" ? "light" : "dark"));

	return (
		<Routes>
			<Route
				path="/login"
				element={
					<Login
						theme={theme}
						onToggleTheme={toggleTheme}
					/>
				}
			/>
			<Route
				path="/*"
				element={
					<ProtectedRoute roles={["admin", "analyst"]}>
						<div className="container">
							<Sidebar />
							<div>
								<Navbar
									theme={theme}
									onToggleTheme={toggleTheme}
								/>
								<div className="content">
									<Routes>
										<Route
											index
											element={<Dashboard />}
										/>
										<Route
											path="price-index"
											element={<PriceIndex />}
										/>
										<Route
											path="forecasts"
											element={<Forecasts />}
										/>
										<Route
											path="sellers"
											element={<Sellers />}
										/>
										<Route
											path="industry-updates"
											element={<IndustryUpdates />}
										/>
									</Routes>
								</div>
							</div>
						</div>
					</ProtectedRoute>
				}
			/>
		</Routes>
	);
}
