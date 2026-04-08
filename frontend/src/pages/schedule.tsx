import { useRouter } from "next/router";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import { getAuth } from "@/utils/getAuth";
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";

const lato = Lato({ subsets: ["latin"], weight: ["400", "700"] });
const yesevaOne = Yeseva_One({ subsets: ["latin"], weight: ["400"] });

type BackendEvent = {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_type: string;
    status: string;
    visibility: string;
    athlete_id: string;
};

type AthleteProfile = {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
};

const EVENT_COLORS: Record<string, string> = {
    TRAINING: "bg-[#9cbcd9] text-[#121914]",
    MATCH: "bg-[#c8a84b] text-[#121914]",
    PERSONAL: "bg-[#4a7c59] text-white",
    CONDITIONING: "bg-[#7b5ea7] text-white",
};

const ATHLETE_EVENT_TYPES = ["TRAINING", "MATCH", "PERSONAL", "CONDITIONING"];
const STAFF_EVENT_TYPES = ["TRAINING", "MATCH", "CONDITIONING"];

export default function SchedulePage() {
    const router = useRouter();
    const [role, setRole] = useState<string>("");
    const [linkedAthletes, setLinkedAthletes] = useState<AthleteProfile[]>([]);
    const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
    const [events, setEvents] = useState<BackendEvent[]>([]);
    const [currentWeekStart, setCurrentWeekStart] = useState(
        startOfWeek(new Date(), { weekStartsOn: 0 })
    );
    const [showEventModal, setShowEventModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [form, setForm] = useState({
        title: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "10:00",
        eventType: "TRAINING",
    });
    const [logForm, setLogForm] = useState({
        date: format(new Date(), "yyyy-MM-dd"),
        load: "7",
        fatigue: "5",
        mentalScore: "7",
    });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [logError, setLogError] = useState("");

    const week = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(currentWeekStart, i);
        return { label: format(date, "EEE"), dateLabel: format(date, "MMM dd"), fullDate: date };
    });

    const hours = Array.from({ length: 18 }, (_, i) => i + 5);

    const formatHour = (hour: number) => {
        const period = hour >= 12 ? "PM" : "AM";
        const h = hour % 12 === 0 ? 12 : hour % 12;
        return `${h} ${period}`;
    };

    const isStaff = role === "COACHING_STAFF" || role === "HEAD_COACH";

    useEffect(() => {
        const fetchProfile = async () => {
            const res = await getAuth("http://127.0.0.1:8000/api/auth/get_profile/", { method: "GET" }, router);
            if (res?.ok) {
                const data = await res.json();
                setRole(data.profile.role);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!role || role === "ATHLETE") return;
        const fetchLinked = async () => {
            const res = await getAuth("http://127.0.0.1:8000/api/auth/linked/", { method: "GET" }, router);
            if (res?.ok) {
                const data = await res.json();
                const athletes: AthleteProfile[] = data.athletes || [];
                setLinkedAthletes(athletes);
                if (athletes.length > 0) setSelectedAthleteId(athletes[0].id);
            }
        };
        fetchLinked();
    }, [role]);

    const fetchEvents = useCallback(async () => {
        if (!role) return;
        if (isStaff && !selectedAthleteId) return;

        const start = format(currentWeekStart, "yyyy-MM-dd'T'HH:mm:ss");
        const end = format(addDays(currentWeekStart, 7), "yyyy-MM-dd'T'HH:mm:ss");
        const body: Record<string, string> = { start_of_week: start, end_of_week: end };
        if (isStaff && selectedAthleteId) body.athlete_id = selectedAthleteId;

        const res = await getAuth(
            "http://127.0.0.1:8000/api/scheduling/get_weekly_schedule/",
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
            router
        );
        if (res?.ok) {
            const data = await res.json();
            setEvents(data.events || []);
        }
    }, [currentWeekStart, role, selectedAthleteId]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const pendingEvents = events.filter((e) => e.status === "PENDING");

    const getEventsForCell = (dayIndex: number, hour: number) => {
        const dayDate = week[dayIndex].fullDate;
        return events.filter((e) => {
            const start = new Date(e.start_time);
            return format(start, "yyyy-MM-dd") === format(dayDate, "yyyy-MM-dd") && start.getHours() === hour;
        });
    };

    const getEventDisplay = (event: BackendEvent) => {
        if (isStaff && event.visibility === "BLOCKED") {
            return { label: "Unavailable", colorClass: "bg-[#2a3a2e] text-gray-400 italic" };
        }
        const pending = event.status === "PENDING";
        const label = pending ? `${event.title} (Pending)` : event.title;
        const base = EVENT_COLORS[event.event_type] ?? "bg-[#1a261e] text-white";
        return { label, colorClass: pending ? `${base} opacity-60` : base };
    };

    const handleApproveReject = async (eventId: string, action: "APPROVE" | "REJECT") => {
        await getAuth(
            "http://127.0.0.1:8000/api/scheduling/approve_reject_event/",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ "reject/approve": action, event_id: eventId }),
            },
            router
        );
        fetchEvents();
    };

    const handleCreateEvent = async () => {
        if (!form.title || !form.date || !form.startTime || !form.endTime) {
            setFormError("All fields are required.");
            return;
        }
        if (form.startTime >= form.endTime) {
            setFormError("End time must be after start time.");
            return;
        }
        setSubmitting(true);
        setFormError("");
        const body: Record<string, string> = {
            title: form.title,
            start_time: `${form.date}T${form.startTime}:00`,
            end_time: `${form.date}T${form.endTime}:00`,
            event_type: form.eventType,
        };
        if (isStaff) body.athlete_id = selectedAthleteId;

        const res = await getAuth(
            "http://127.0.0.1:8000/api/scheduling/create_event/",
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
            router
        );
        setSubmitting(false);
        if (res?.ok) {
            setShowEventModal(false);
            setForm({ title: "", date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00", eventType: "TRAINING" });
            fetchEvents();
        } else {
            const data = await res?.json();
            setFormError(data?.error || "Failed to create event.");
        }
    };

    const handleLogActivity = async () => {
        const load = parseFloat(logForm.load);
        const fatigue = parseFloat(logForm.fatigue);
        const mental_score = parseFloat(logForm.mentalScore);
        if (!logForm.date || isNaN(load) || isNaN(fatigue) || isNaN(mental_score)) {
            setLogError("All fields are required.");
            return;
        }
        if ([load, fatigue, mental_score].some((v) => v < 1 || v > 10)) {
            setLogError("All values must be between 1 and 10.");
            return;
        }
        setSubmitting(true);
        setLogError("");
        const res = await getAuth(
            "http://127.0.0.1:8000/api/scheduling/log_activity/",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: logForm.date, load, fatigue, mental_score }),
            },
            router
        );
        setSubmitting(false);
        if (res?.ok) {
            setShowLogModal(false);
            setLogForm({ date: format(new Date(), "yyyy-MM-dd"), load: "7", fatigue: "5", mentalScore: "7" });
        } else {
            const data = await res?.json();
            setLogError(data?.error || "Failed to log activity.");
        }
    };

    return (
        <div className={`${lato.className} min-h-screen bg-[#121914]`}>
            <nav className="w-full flex items-center justify-between px-8 pt-2 pb-1 bg-[#1a261e] border-b border-[#c8a84b33]">
                <Image src="/CourtIQlogo.png" alt="CourtIQ Logo" width={187.5} height={75} priority />
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push("/dashboard")}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">Dashboard</button>
                    <button onClick={() => router.push("/schedule")}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer px-5 h-18 bg-[#121914] border-b border-[#c8a84b33] border-2">Schedule</button>
                    <button onClick={() => router.push("/profile")}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">Profile</button>
                    <button onClick={() => { localStorage.removeItem("token"); router.push("/"); }}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">Log Out</button>
                </div>
            </nav>

            <div className="px-8 py-6 flex items-center justify-between border-b border-[#c8a84b33]">
                <h1 className={`${yesevaOne.className} text-white text-3xl`}>Weekly Schedule</h1>
                <div className="flex items-center gap-3">
                    {isStaff && linkedAthletes.length > 0 && (
                        <select value={selectedAthleteId} onChange={(e) => setSelectedAthleteId(e.target.value)}
                            className="bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9] cursor-pointer">
                            {linkedAthletes.map((a) => (
                                <option key={a.id} value={a.id}>{a.first_name} {a.last_name} (@{a.username})</option>
                            ))}
                        </select>
                    )}
                    {isStaff && linkedAthletes.length === 0 && (
                        <span className="text-gray-400 text-sm">No linked athletes</span>
                    )}
                    {!isStaff && (
                        <button onClick={() => setShowLogModal(true)}
                            className="px-4 py-2 bg-[#1a261e] text-[#9cbcd9] font-semibold rounded-lg border border-[#c8a84b33] hover:border-[#9cbcd9] transition cursor-pointer text-sm">
                            + Log Activity
                        </button>
                    )}
                    {(!isStaff || selectedAthleteId) && (
                        <button onClick={() => setShowEventModal(true)}
                            className="px-4 py-2 bg-[#c8a84b] text-[#121914] font-bold rounded-lg hover:brightness-110 transition cursor-pointer">
                            {isStaff ? "+ Request Session" : "+ New Event"}
                        </button>
                    )}
                </div>
            </div>

            {/* Pending requests banner for athletes */}
            {!isStaff && pendingEvents.length > 0 && (
                <div className="px-8 py-4 bg-[#1a261e] border-b border-[#c8a84b33]">
                    <h3 className="text-[#c8a84b] font-semibold text-sm mb-3">
                        Pending Session Requests ({pendingEvents.length})
                    </h3>
                    <div className="flex flex-col gap-2">
                        {pendingEvents.map((event) => (
                            <div key={event.id} className="flex items-center justify-between bg-[#121914] rounded-lg px-4 py-2 border border-[#c8a84b33]">
                                <div>
                                    <span className="text-white text-sm font-semibold">{event.title}</span>
                                    <span className="text-[#9cbcd9] text-xs ml-3">
                                        {new Date(event.start_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                        {" · "}
                                        {new Date(event.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                        {" – "}
                                        {new Date(event.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleApproveReject(event.id, "APPROVE")}
                                        className="px-3 py-1 bg-[#4a7c59] text-white text-xs font-bold rounded-lg hover:brightness-110 cursor-pointer transition">
                                        Approve
                                    </button>
                                    <button onClick={() => handleApproveReject(event.id, "REJECT")}
                                        className="px-3 py-1 bg-[#7c4a4a] text-white text-xs font-bold rounded-lg hover:brightness-110 cursor-pointer transition">
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center bg-[#1a261e] px-8 py-3 text-[#9cbcd9] border-b border-[#c8a84b33]">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentWeekStart((p) => subWeeks(p, 1))}
                            className="px-3 hover:text-white text-lg font-bold cursor-pointer">&lt;</button>
                        <button onClick={() => setCurrentWeekStart((p) => addWeeks(p, 1))}
                            className="px-3 hover:text-white text-lg font-bold cursor-pointer">&gt;</button>
                    </div>
                    <span className="text-sm font-semibold">
                        {format(currentWeekStart, "MMMM do, yyyy")} – {format(addDays(currentWeekStart, 6), "MMMM do, yyyy")}
                    </span>
                </div>
                <button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
                    className="ml-auto px-4 py-1 rounded-lg bg-[#9cbcd9] text-[#121914] font-semibold hover:brightness-110 cursor-pointer transition">
                    Today
                </button>
            </div>

            <div className="overflow-x-auto px-8 py-4">
                <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[700px]">
                    <div className="border-r border-b border-[#c8a84b33] p-2" />
                    {week.map((day, i) => (
                        <div key={i} className="text-center border-r border-b border-[#c8a84b33] p-2">
                            <div className="text-sm font-bold text-white">{day.label}</div>
                            <div className="text-xs text-gray-400">{day.dateLabel}</div>
                        </div>
                    ))}
                    {hours.map((hour) => (
                        <>
                            <div key={`label-${hour}`}
                                className="text-xs text-gray-400 border-r border-b border-[#c8a84b33] p-2 min-h-[56px] flex items-start justify-end pr-3 pt-2">
                                {formatHour(hour)}
                            </div>
                            {week.map((_, dayIndex) => (
                                <div key={`${dayIndex}-${hour}`}
                                    className="border-r border-b border-[#c8a84b33] p-1 min-h-[56px] bg-[#121914]">
                                    {getEventsForCell(dayIndex, hour).map((event) => {
                                        const { label, colorClass } = getEventDisplay(event);
                                        return (
                                            <div key={event.id}
                                                className={`text-xs font-semibold px-2 py-1 rounded mb-1 truncate ${colorClass}`}
                                                title={label}>
                                                {label}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </>
                    ))}
                </div>
            </div>

            {/* New Event / Request Session Modal */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-8 w-full max-w-md mx-4">
                        <h2 className={`${yesevaOne.className} text-white text-xl mb-6`}>
                            {isStaff ? "Request Session" : "New Event"}
                        </h2>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-[#9cbcd9] text-sm mb-1 block">Title</label>
                                <input type="text" value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Morning Training"
                                    className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                            </div>
                            <div>
                                <label className="text-[#9cbcd9] text-sm mb-1 block">Date</label>
                                <input type="date" value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[#9cbcd9] text-sm mb-1 block">Start Time</label>
                                    <input type="time" value={form.startTime}
                                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                        className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                                </div>
                                <div>
                                    <label className="text-[#9cbcd9] text-sm mb-1 block">End Time</label>
                                    <input type="time" value={form.endTime}
                                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                        className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[#9cbcd9] text-sm mb-1 block">Event Type</label>
                                <select value={form.eventType}
                                    onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                                    className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]">
                                    {(isStaff ? STAFF_EVENT_TYPES : ATHLETE_EVENT_TYPES).map((t) => (
                                        <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                                    ))}
                                </select>
                            </div>
                            {isStaff && (
                                <p className="text-[#9cbcd9] text-xs bg-[#121914] rounded-lg px-3 py-2 border border-[#c8a84b33]">
                                    This will appear as pending on the athlete's schedule until they approve it.
                                </p>
                            )}
                            {formError && <p className="text-red-400 text-sm">{formError}</p>}
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => { setShowEventModal(false); setFormError(""); }}
                                    className="flex-1 py-2 rounded-lg border border-[#c8a84b33] text-[#9cbcd9] text-sm hover:border-[#9cbcd9] transition cursor-pointer">
                                    Cancel
                                </button>
                                <button onClick={handleCreateEvent} disabled={submitting}
                                    className="flex-1 py-2 rounded-lg bg-[#c8a84b] text-[#121914] font-bold text-sm hover:brightness-110 transition cursor-pointer disabled:opacity-50">
                                    {submitting ? "Submitting..." : isStaff ? "Send Request" : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Activity Modal (athletes only) */}
            {showLogModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-8 w-full max-w-md mx-4">
                        <h2 className={`${yesevaOne.className} text-white text-xl mb-2`}>Log Activity</h2>
                        <p className="text-[#9cbcd9] text-sm mb-6">Rate each metric from 1 (low) to 10 (high).</p>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-[#9cbcd9] text-sm mb-1 block">Date</label>
                                <input type="date" value={logForm.date}
                                    onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                                    className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[#9cbcd9] text-sm mb-1 block">Load</label>
                                    <input type="number" min="1" max="10" step="0.5" value={logForm.load}
                                        onChange={(e) => setLogForm({ ...logForm, load: e.target.value })}
                                        className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                                </div>
                                <div>
                                    <label className="text-[#9cbcd9] text-sm mb-1 block">Fatigue</label>
                                    <input type="number" min="1" max="10" step="0.5" value={logForm.fatigue}
                                        onChange={(e) => setLogForm({ ...logForm, fatigue: e.target.value })}
                                        className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                                </div>
                                <div>
                                    <label className="text-[#9cbcd9] text-sm mb-1 block">Mental</label>
                                    <input type="number" min="1" max="10" step="0.5" value={logForm.mentalScore}
                                        onChange={(e) => setLogForm({ ...logForm, mentalScore: e.target.value })}
                                        className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                                </div>
                            </div>
                            {logError && <p className="text-red-400 text-sm">{logError}</p>}
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => { setShowLogModal(false); setLogError(""); }}
                                    className="flex-1 py-2 rounded-lg border border-[#c8a84b33] text-[#9cbcd9] text-sm hover:border-[#9cbcd9] transition cursor-pointer">
                                    Cancel
                                </button>
                                <button onClick={handleLogActivity} disabled={submitting}
                                    className="flex-1 py-2 rounded-lg bg-[#c8a84b] text-[#121914] font-bold text-sm hover:brightness-110 transition cursor-pointer disabled:opacity-50">
                                    {submitting ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
