import { Routes, Route } from "react-router-dom";
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
	return (
		<Routes>
			<Route
				path="/login"
				element={<Login />}
			/>
			<Route
				path="/*"
				element={
					<ProtectedRoute roles={["admin", "analyst"]}>
						<div className="container">
							<Sidebar />
							<div>
								<Navbar />
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
