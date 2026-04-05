import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import Image from "next/image";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { getAuth } from "../utils/getAuth";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

const lato = Lato({ subsets: ["latin"], weight: ["400", "700"] });
const yesevaOne = Yeseva_One({ subsets: ["latin"], weight: ["400"] });

type ActivityLog = {
    date: string;
    load: number;
    fatigue: number;
    mental_score: number;
};

type MatchStat = {
    match_date: string;
    wins: number;
    losses: number;
};

type StatsResponse = {
    activity_logs: ActivityLog[];
    match_statistics: MatchStat[];
    period: string;
};

const chartOptions = {
    responsive: true,
    plugins: {
        legend: { labels: { color: "#ffffff" } },
    },
    scales: {
        x: { ticks: { color: "#9cbcd9" }, grid: { color: "#1a261e" } },
        y: { ticks: { color: "#9cbcd9" }, grid: { color: "#1a261e" } },
    },
};

export default function Dashboard() {
    const router = useRouter();
    const [period, setPeriod] = useState<"week" | "month">("week");
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const response = await getAuth(
                `http://127.0.0.1:8000/api/scheduling/statistics/?period=${period}`,
                { method: "GET" },
                router
            );

            if (response && response.ok) {
                const data = await response.json();
                setStats(data);
            }
            setLoading(false);
        };

        fetchStats();
    }, [period]);

    const workloadData = {
        labels: stats?.activity_logs.map((log) =>
            new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        ) ?? [],
        datasets: [
            {
                label: "Workload",
                data: stats?.activity_logs.map((log) => log.load) ?? [],
                backgroundColor: "#9cbcd9",
                borderColor: "#9cbcd9",
                tension: 0.3,
            },
        ],
    };

    const totalWins = stats?.match_statistics.reduce((sum, m) => sum + m.wins, 0) ?? 0;
    const totalLosses = stats?.match_statistics.reduce((sum, m) => sum + m.losses, 0) ?? 0;
    const winRate = totalWins + totalLosses > 0
        ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
        : 0;

    const winRateData = {
        labels: ["Wins", "Losses"],
        datasets: [
            {
                label: "Match Results",
                data: [totalWins, totalLosses],
                backgroundColor: ["#c8a84b", "#9cbcd9"],
            },
        ],
    };

    return (
        <div className={`${lato.className} min-h-screen bg-[#121914]`}>
            <nav className="w-full flex items-center justify-between px-8 pt-2 pb-1 bg-[#1a261e] border-b border-[#c8a84b33]">
                <Image
                    src="/CourtIQlogo.png"
                    alt="CourtIQ Logo"
                    width={187.5}
                    height={75}
                    priority
                />
                <div className="flex items-center gap-6">
                    <button className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer px-5 h-18 bg-[#121914] border-b border-[#c8a84b33] border-2">
                        Dashboard
                    </button>
                    <button
                        onClick={() => router.push("/schedule")}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Schedule
                    </button>
                    <button
                        onClick={() => router.push("/profile")}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Profile
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem("token");
                            router.push("/");
                        }}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Log Out
                    </button>
                </div>
            </nav>

            <div className="px-10 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className={`${yesevaOne.className} text-white text-3xl`}>
                        Dashboard
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPeriod("week")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                                period === "week"
                                    ? "bg-[#9cbcd9] text-[#121914]"
                                    : "bg-[#1a261e] text-white border border-[#c8a84b33]"
                            }`}>
                            Last 7 Days
                        </button>
                        <button
                            onClick={() => setPeriod("month")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                                period === "month"
                                    ? "bg-[#9cbcd9] text-[#121914]"
                                    : "bg-[#1a261e] text-white border border-[#c8a84b33]"
                            }`}>
                            Last 30 Days
                        </button>
                    </div>
                </div>

                {loading ? (
                    <p className="text-[#9cbcd9] text-center mt-20">Loading...</p>
                ) : (
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div className="bg-[#1a261e] rounded-2xl p-6 border border-[#c8a84b33]">
                            <h2 className="text-white font-bold mb-4">Workload</h2>
                            {workloadData.labels.length > 0 ? (
                                <Line data={workloadData} options={chartOptions} />
                            ) : (
                                <p className="text-[#9cbcd9] text-sm text-center py-10">
                                    No activity data for this period.
                                </p>
                            )}
                        </div>

                        <div className="bg-[#1a261e] rounded-2xl p-6 border border-[#c8a84b33]">
                            <h2 className="text-white font-bold mb-1">Win Rate</h2>
                            <p className="text-[#c8a84b] text-2xl font-bold mb-4">
                                {winRate}%
                            </p>
                            {totalWins + totalLosses > 0 ? (
                                <Bar data={winRateData} options={chartOptions} />
                            ) : (
                                <p className="text-[#9cbcd9] text-sm text-center py-10">
                                    No match data for this period.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
