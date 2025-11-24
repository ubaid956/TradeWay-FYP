import { Line } from "react-chartjs-2";
import {
	Chart,
	LineElement,
	CategoryScale,
	LinearScale,
	PointElement,
	Tooltip,
	Legend,
} from "chart.js";
Chart.register(
	LineElement,
	CategoryScale,
	LinearScale,
	PointElement,
	Tooltip,
	Legend
);

export default function LineChart({ labels, series, title }) {
	const data = {
		labels,
		datasets: series.map((s) => ({
			label: s.name,
			data: s.data,
			tension: 0.25,
			pointRadius: 4,
			borderWidth: 2,
			borderColor: s.name.includes("Actual") ? "#1a237e" : "#3949ab",
			backgroundColor: s.name.includes("Actual") ? "#1a237e" : "#3949ab",
			pointBackgroundColor: s.name.includes("Actual") ? "#1a237e" : "#3949ab",
			fill: false,
		})),
	};
	const options = {
		plugins: {
			legend: {
				labels: {
					color: "#1a237e",
					font: {
						size: 12,
						weight: "bold",
					},
				},
			},
			tooltip: {
				mode: "index",
				intersect: false,
				backgroundColor: "rgba(255, 255, 255, 0.9)",
				titleColor: "#1a237e",
				bodyColor: "#3949ab",
				borderColor: "#c5cae9",
				borderWidth: 1,
			},
		},
		scales: {
			x: {
				ticks: { color: "#3949ab" },
				grid: { color: "#e8eaf6" },
			},
			y: {
				ticks: { color: "#3949ab" },
				grid: { color: "#e8eaf6" },
			},
		},
		maintainAspectRatio: false,
	};
	return (
		<div
			className="card"
			style={{ height: 320 }}
		>
			<div style={{ marginBottom: 8 }}>{title}</div>
			<Line
				data={data}
				options={options}
			/>
		</div>
	);
}
