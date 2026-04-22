import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import Navbar from "@/components/Navbar";
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
import { Weight } from "lucide-react";


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

type AthleteProfile = {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
};

const chartOptions = {
    responsive: true,
    plugins: {
        legend: { labels: { color: "#ffffff" } },
    },
    scales: {
        x: { ticks: { color: "#9cbcd9" }, grid: { color: "#1a261e" } },
        y: { min: 1, max: 10, ticks: { stepSize: 1, color: "#9cbcd9" }, grid: { color: "#1a261e" } },
    },
};

export default function Dashboard() {
    const router = useRouter();
    const [role, setRole] = useState<string>("");
    const [linkedAthletes, setLinkedAthletes] = useState<AthleteProfile[]>([]);
    const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
    const [period, setPeriod] = useState<"week" | "month">("week");
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const isStaff = role === "COACHING_STAFF" || role === "HEAD_COACH";

    useEffect(() => {
        const fetchProfile = async () => {
            const res = await getAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/get_profile/`,
                { method: "GET" },
                router
            );
            if (res?.ok) {
                const data = await res.json();
                setRole(data.profile.role);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!isStaff) return;
        const fetchLinked = async () => {
            const res = await getAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/linked/`,
                { method: "GET" },
                router
            );
            if (res?.ok) {
                const data = await res.json();
                const athletes: AthleteProfile[] = data.athletes || [];
                setLinkedAthletes(athletes);
                if (athletes.length > 0) setSelectedAthleteId(athletes[0].id);
            }
        };
        fetchLinked();
    }, [isStaff]);

    const fetchStats = useCallback(async () => {
        if (!role) return;
        if (isStaff && !selectedAthleteId) return;

        setLoading(true);
        let url = `${process.env.NEXT_PUBLIC_API_URL}/api/scheduling/statistics/?period=${period}`;
        if (isStaff && selectedAthleteId) url += `&athlete_id=${selectedAthleteId}`;

        const response = await getAuth(url, { method: "GET" }, router);
        if (response?.ok) {
            const data = await response.json();
            setStats(data);
        }
        setLoading(false);
    }, [period, role, selectedAthleteId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

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

    const fatigueData = {
        labels: stats?.activity_logs.map((log) =>
            new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        ) ?? [],
        datasets: [
            {
                label: "Fatigue",
                data: stats?.activity_logs.map((log) => log.fatigue) ?? [],
                backgroundColor: "#9cbcd9",
                borderColor: "#9cbcd9",
                tension: 0.3,
            },
        ],
    };

    const mentalScoreData = {
        labels: stats?.activity_logs.map((log) =>
            new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        ) ?? [],
        datasets: [
            {
                label: "Mental Score",
                data: stats?.activity_logs.map((log) => log.mental_score) ?? [],
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
                backgroundColor: ["#d5d131", "#9cbcd9"],
            },
        ],
    };

    const winRateOptions = {
        responsive: true,
        plugins: { legend: { labels: { color: "#ffffff" } } },
        scales: {
            x: { ticks: { color: "#9cbcd9" }, grid: { color: "#1a261e" } },
            y: { min: 0, ticks: { stepSize: 1, color: "#9cbcd9", precision: 0 }, grid: { color: "#1a261e" } },
        },
    };

    const selectedAthlete = linkedAthletes.find((a) => a.id === selectedAthleteId);

    return (
        <div className={`${lato.className} min-h-screen bg-[#121914]`}>
        
            <Navbar/>

            <div className="px-10 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className={`${yesevaOne.className} text-white text-3xl`}>Dashboard</h1>
                        {isStaff && selectedAthlete && (
                            <p className="text-[#9cbcd9] text-sm mt-1">
                                Viewing: {selectedAthlete.first_name} {selectedAthlete.last_name} (
                                    <span className="text-[#d5d131]">@{selectedAthlete.username}</span>
                                )
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {isStaff && linkedAthletes.length > 0 && (
                            <select
                                value={selectedAthleteId}
                                onChange={(e) => setSelectedAthleteId(e.target.value)}
                                className="bg-[#1a261e] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9] cursor-pointer">
                                {linkedAthletes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.first_name} {a.last_name}
                                    </option>
                                ))}
                            </select>
                        )}
                        {isStaff && linkedAthletes.length === 0 && (
                            <span className="text-gray-400 text-sm">No linked athletes</span>
                        )}
                        <button onClick={() => setPeriod("week")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-transform transition-colors cursor-pointer ${period === "week" ? "bg-[#9cbcd9] text-[#121914] hover:brightness-110 hover:scale-103" : "bg-[#1a261e] text-white border border-[#c8a84b33] hover:border-[#9cbcd9] hover:scale-103"}`}>
                            Last 7 Days
                        </button>
                        <button onClick={() => setPeriod("month")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-transform transition-colors cursor-pointer ${period === "month" ? "bg-[#9cbcd9] text-[#121914] hover:brightness-110 hover:scale-103" : "bg-[#1a261e] text-white border border-[#c8a84b33] hover:border-[#9cbcd9] hover:scale-103"}`}>
                            Last 30 Days
                        </button>
                    </div>
                </div>

                {isStaff && linkedAthletes.length === 0 ? (
                    <p className="text-[#9cbcd9] text-center mt-20">
                        No linked athletes. Link athletes from the Profile page to view their stats.
                    </p>
                ) : loading ? (
                    <p className="text-[#9cbcd9] text-center mt-20">Loading...</p>
                ) : (
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div className="bg-[#1a261e] rounded-2xl p-6 border border-[#c8a84b33]">
                            <h2 className="text-white font-bold mb-1">Win Rate</h2>
                            <p className="text-[#d5d131] text-2xl font-bold mb-1">{winRate}%</p>
                            <p className="text-[#9cbcd9] text-xs mb-4">{totalWins}W – {totalLosses}L this period</p>
                            {totalWins + totalLosses > 0 ? (
                                <Bar data={winRateData} options={winRateOptions} />
                            ) : (
                                <p className="text-[#9cbcd9] text-sm text-center py-10">
                                    No match data for this period.
                                </p>
                            )}
                        </div>

                        <div className="bg-[#1a261e] rounded-2xl p-6 border border-[#c8a84b33]">
                            <h2 className="text-white font-bold mb-1">Workload</h2>
                            <p className="text-[#9cbcd9] text-xs mb-4">Training load over time (1–10 scale)</p>
                            {workloadData.labels.length > 0 ? (
                                <Line data={workloadData} options={chartOptions} />
                            ) : (
                                <p className="text-[#9cbcd9] text-sm text-center py-10">
                                    No activity data for this period.
                                </p>
                            )}
                        </div>

                        <div className="bg-[#1a261e] rounded-2xl p-6 border border-[#c8a84b33]">
                            <h2 className="text-white font-bold mb-1">Fatigue</h2>
                            <p className="text-[#9cbcd9] text-xs mb-4">Training fatigue over time (1–10 scale)</p>
                            {fatigueData.labels.length > 0 ? (
                                <Line data={fatigueData} options={chartOptions} />
                            ) : (
                                <p className="text-[#9cbcd9] text-sm text-center py-10">
                                    No activity data for this period.
                                </p>
                            )}
                        </div>

                        <div className="bg-[#1a261e] rounded-2xl p-6 border border-[#c8a84b33]">
                            <h2 className="text-white font-bold mb-1">Mental Score</h2>
                            <p className="text-[#9cbcd9] text-xs mb-4">Mental score over time (1–10 scale)</p>
                            {mentalScoreData.labels.length > 0 ? (
                                <Line data={mentalScoreData} options={chartOptions} />
                            ) : (
                                <p className="text-[#9cbcd9] text-sm text-center py-10">
                                    No activity data for this period.
                                </p>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
