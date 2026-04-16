import { useRouter } from "next/router";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import { getAuth } from "@/utils/getAuth";
import Navbar from "@/components/Navbar";
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
    MATCH: "bg-[#d5d131] text-[#121914]",
    PERSONAL: "bg-[#5f9a70] text-[#121914]",
    CONDITIONING: "bg-[#9273c2] text-[#121914]",
};

const ATHLETE_EVENT_TYPES = ["TRAINING", "MATCH", "PERSONAL", "CONDITIONING"];
const REQUEST_SESSION_TYPES = ["TRAINING", "CONDITIONING"];

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
    const [showSidebar, setShowSidebar] = useState(false);
    const [form, setForm] = useState({
        title: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "10:00",
        eventType: "TRAINING",
        repeat: false,
        repeatWeeks: "4",
    });
    const [logForm, setLogForm] = useState({
        date: format(new Date(), "yyyy-MM-dd"),
        load: "7",
        fatigue: "5",
        mentalScore: "7",
    });
    const [userId, setUserId] = useState<string>("");
    const isAthlete = role === "ATHLETE";
    const isStaff = role === "COACHING_STAFF" || role === "HEAD_COACH";
    const isHeadCoach = role === "HEAD_COACH";
    const [selectedEvent, setSelectedEvent] = useState<BackendEvent | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string>("");
    const [editForm, setEditForm] = useState({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        eventType: "TRAINING",
    });
    const [eventToDelete, setEventToDelete] = useState<BackendEvent | null>(null);
    const [eventToReject, setEventToReject] = useState<BackendEvent | null>(null);
    const activeEvent = eventToDelete || eventToReject;
    const [isMatch, setIsMatch] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [logError, setLogError] = useState("");
    const [editError, setEditError] = useState("");

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

    useEffect(() => {
        const fetchProfile = async () => {
            const res = await getAuth("http://127.0.0.1:8000/api/auth/get_profile/", { method: "GET" }, router);
            if (res?.ok) {
                const data = await res.json();
                setRole(data.profile.role);
                setUserId(data.profile.id);
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
        if (pending) {return {label, colorClass: "bg-gray-400 text-[#1a261e]"};}
        const base = EVENT_COLORS[event.event_type] ?? "bg-[#1a261e] text-white";
        return { label, colorClass: base };
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

        const weeks = form.repeat ? Math.max(1, parseInt(form.repeatWeeks) || 1) : 1;
        const baseDate = new Date(form.date + "T00:00:00");
        let failed = false;

        for (let i = 0; i < weeks; i++) {
            const eventDate = format(
                new Date(baseDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
                "yyyy-MM-dd"
            );
            const body: Record<string, string> = {
                title: form.title,
                start_time: `${eventDate}T${form.startTime}:00`,
                end_time: `${eventDate}T${form.endTime}:00`,
                event_type: form.eventType,
            };
            if (isStaff) body.athlete_id = selectedAthleteId;

            const res = await getAuth(
                "http://127.0.0.1:8000/api/scheduling/create_event/",
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
                router
            );
            if (!res?.ok) {
                const data = await res?.json();
                setFormError(data?.error || `Failed on week ${i + 1}.`);
                failed = true;
                break;
            }
        }

        setSubmitting(false);
        if (!failed) {
            setShowEventModal(false);
            setForm({ title: "", date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00", eventType: "TRAINING", repeat: false, repeatWeeks: "4" });
            fetchEvents();
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        await getAuth(
            "http://127.0.0.1:8000/api/scheduling/delete_event/",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_id: eventId }),
            },
            router
        );
        setSelectedEvent(null);
        fetchEvents();
    };

    const openEditModal = (event: BackendEvent) => {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        setEditForm({
            title: event.title,
            date: format(start, "yyyy-MM-dd"),
            startTime: format(start, "HH:mm"),
            endTime: format(end, "HH:mm"),
            eventType: event.event_type,
        });
        setEditingEventId(event.id);
        setEditError("");
        setSelectedEvent(null);
        setShowEditModal(true);
    };

    const handleEditEvent = async () => {
        if (!editingEventId) return;
        if (!editForm.title || !editForm.date || !editForm.startTime || !editForm.endTime) {
            setEditError("All fields are required.");
            return;
        }
        if (editForm.startTime >= editForm.endTime) {
            setEditError("End time must be after start time.");
            return;
        }
        setSubmitting(true);
        setEditError("");
        // We need to track which event is being edited
        const res = await getAuth(
            "http://127.0.0.1:8000/api/scheduling/edit_event/",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: editingEventId,
                    title: editForm.title,
                    start_time: `${editForm.date}T${editForm.startTime}:00`,
                    end_time: `${editForm.date}T${editForm.endTime}:00`,
                    event_type: editForm.eventType,
                }),
            },
            router
        );
        setSubmitting(false);
        if (res?.ok) {
            setShowEditModal(false);
            setEditingEventId("");
            fetchEvents();
        } else {
            const data = await res?.json();
            setEditError(data?.error || "Failed to update event.");
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
            <Navbar/>

            <div className="px-8 py-6 flex items-center justify-between border-b border-[#c8a84b33]">
                <h1 className={`${yesevaOne.className} text-white text-3xl`}>Weekly Schedule</h1>
                <div className="flex items-center gap-3">
                    {isStaff && linkedAthletes.length > 0 && (
                        <select value={selectedAthleteId} onChange={(e) => setSelectedAthleteId(e.target.value)}
                            className="bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm">
                            {linkedAthletes.map((a) => (
                                <option key={a.id} value={a.id}>{a.first_name} {a.last_name} (@{a.username})</option>
                            ))}
                        </select>
                    )}
                    {isStaff && linkedAthletes.length === 0 && (
                        <span className="text-gray-400 text-sm">No linked athletes</span>
                    )}
                    {/* ATHLETE */}
                    {isAthlete && (
                        <>
                        <button onClick={() => setShowLogModal(true)}
                            className="px-4 py-2 bg-[#1a261e] text-[#9cbcd9] text-sm font-semibold rounded-lg border border-[#c8a84b33] cursor-pointer transition-transform hover:border-[#9cbcd9] hover:scale-103 active:scale-100 active:brightness-75">
                            + Log Activity
                        </button>
                        <button onClick={() => setShowEventModal(true)}
                            className="px-4 py-2 bg-[#d5d131] text-[#121914] font-bold rounded-lg cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
                            + New Event
                        </button>
                        </>
                    )}
                    {/* COACHING STAFF & HEAD COACH */}
                    {(isStaff && selectedAthleteId) && (
                        <button onClick={() => {setIsMatch(false); setShowEventModal(true);}}
                            className="px-4 py-2 bg-[#1a261e] text-[#9cbcd9] text-sm font-semibold rounded-lg border border-[#c8a84b33] cursor-pointer transition-transform hover:border-[#9cbcd9] hover:scale-103 active:scale-100 active:brightness-75">
                            + Request Session
                        </button>
                    )}
                    {/* HEAD COACH */}
                    {(isHeadCoach && selectedAthleteId) && (
                        <button onClick={() => 
                            {setIsMatch(true); setForm(prev => ({ ...prev, eventType: "MATCH" })); setShowEventModal(true);}}
                            className="px-4 py-2 bg-[#d5d131] text-[#121914] font-bold rounded-lg cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
                            + Add Match
                        </button>
                    )}
                </div>
            </div>

            {/* Pending requests banner for athletes */}
            {!isStaff && pendingEvents.length > 0 && (
                <div className="px-8 py-4 bg-[#1a261e] border-b border-[#c8a84b33]">
                    <h3 className="text-[#d5d131] font-semibold text-sm mb-3">
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
                                        className="px-3 py-1 bg-[#d5d131] text-[#121914] text-xs font-bold rounded-lg cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
                                        Approve
                                    </button>
                                    <button onClick={() => setEventToReject(event)}
                                        className="px-3 py-1 bg-red-400 text-[#121914] text-xs font-bold rounded-lg cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Current Week */}
            <div className="flex items-center bg-[#1a261e] px-8 py-3 text-[#9cbcd9] border-b border-[#c8a84b33]">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setShowSidebar((prev) => !prev)}
                            className="text-white text-xl mr-5 hover:text-[#9cbcd9] transition cursor-pointer"> 
                            {"\u2630"}
                        </button>
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
                    className="ml-auto px-4 py-1 rounded-lg bg-[#9cbcd9] text-[#121914] font-semibold cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
                    Today
                </button>
            </div>

            <div className="flex">
                
                {/* Side Panel */}
                {showSidebar && (
                    <div className="w-48 bg-[#1a261e] border-r border-[#c8a84b33] shadow-lg p-6">
                        <h2 className={`${yesevaOne.className} flex items-center justify-between mb-6 text-white text-lg`}>Legend</h2>
                        {/* Color Legend */}
                        <div className="flex flex-col gap-4">
                            {Object.entries(EVENT_COLORS).map(([type, styles]) => (
                                <div key={type} className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded ${styles}`} />
                                    <span className="text-white text-sm">
                                        {type.charAt(0) + type.slice(1).toLowerCase()}
                                    </span>
                                </div>
                            ))}
                            <div className="flex items-center gap-3 mt-4">
                                <div className="w-4 h-4 rounded bg-gray-400 opacity-60" />
                                <span className="text-gray-300 text-sm">Pending</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Schedule Grid */}
                <div className="flex-1 overflow-x-auto px-8 py-4">
                    <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[700px]">
                        <div className="border-r border-b border-[#c8a84b33] p-2" />
                            {/* Days Labels */}
                            {week.map((day, i) => (
                                <div key={i} className="text-center border-r border-b border-[#c8a84b33] p-2">
                                    <div className="text-sm font-bold text-white">{day.label}</div>
                                    <div className="text-xs text-gray-400">{day.dateLabel}</div>
                                </div>
                            ))}
                            {/* Time Labels */}
                            <div className="flex flex-col">
                                {hours.map((hour) => (
                                    <div key={hour}
                                        className="text-xs text-gray-400 border-r border-b border-[#c8a84b33] h-[56px] flex items-start justify-end pr-3 pt-2">
                                        {formatHour(hour)}
                                    </div>
                                ))}
                            </div>
                            {/* Cells */}
                            {week.map((day, dayIndex) => (
                                <div key={dayIndex}
                                    className="relative border-r border-b border-[#c8a84b33] bg-[#121914]"
                                    style={{ height: `${hours.length * 56}px` }}>
                                    {hours.map((_, i) => (
                                        <div key={i}
                                            className="border-b border-[#c8a84b33]"
                                            style={{ height: "56px" }}/>
                                    ))}

                                    {/* Events */}
                                    {events
                                        .filter((e) => {
                                            const start = new Date(e.start_time);
                                            return format(start, "yyyy-MM-dd") === format(day.fullDate, "yyyy-MM-dd");
                                        })
                                        .map((event) => {
                                            const start = new Date(event.start_time);
                                            const end = new Date(event.end_time);
                                            const startHour = start.getHours() + start.getMinutes() / 60;
                                            const endHour = end.getHours() + end.getMinutes() / 60;
                                            const top = (startHour - 5) * 56;
                                            const minHeight = 28;
                                            const rawHeight = (endHour - startHour) * 56;
                                            const height = Math.max(minHeight, rawHeight);
                                            const { label, colorClass } = getEventDisplay(event);
                                            const clickable = !(isStaff && event.visibility === "BLOCKED");
                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={() => clickable && setSelectedEvent(event)}
                                                    className={`absolute left-1 right-1 rounded px-2 py-1 text-xs font-semibold ${colorClass} ${clickable ? "cursor-pointer hover:brightness-110" : ""}`}
                                                    style={{top: `${top}px`, height: `${height}px`}}>
                                                    <div className="w-full h-full leading-tight overflow-hidden">
                                                        {label}
                                                    </div>
                                                </div>
                                            );
                                        })}
                            </div>
                        ))}
                        
                        {/* {hours.map((hour) => (
                            <>
                                <div key={`label-${hour}`}
                                    className="text-xs text-gray-400 border-r border-b border-[#c8a84b33] p-2 min-h-[56px] flex items-start justify-end pr-3 pt-2">
                                    {formatHour(hour)}
                                </div>
                                {week.map((_, dayIndex) => (
                                    <div key={`${dayIndex}-${hour}`}
                                        className="relative border-r border-b border-[#c8a84b33] p-1 min-h-[56px] bg-[#121914]">
                                        {getEventsForCell(dayIndex, hour).map((event) => {
                                            const { label, colorClass } = getEventDisplay(event);
                                            const clickable = !(isStaff && event.visibility === "BLOCKED");
                                            return (
                                                <div key={event.id}
                                                    onClick={() => clickable && setSelectedEvent(event)}
                                                    className={`text-xs font-semibold px-2 py-1 rounded mb-1 truncate ${colorClass} ${clickable ? "cursor-pointer hover:brightness-110" : ""}`}
                                                    title={label}>
                                                    {label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </>
                        ))} */}
                    </div>
                </div>
            </div>

            {/* New Event / Request Session Modal */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-8 w-full max-w-md mx-4">
                        <h2 className={`${yesevaOne.className} text-white text-xl mb-6`}>
                            {role === "HEAD_COACH" ? "Add Event" : role === "COACHING_STAFF" ? "Request Session" : "New Event"}
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
                                <label className="text-[#9cbcd9] text-sm mb-2 block">Event Type</label>
                                {isMatch ? (
                                    <div className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm">Match</div>
                                ) : (          
                                <select value={form.eventType}
                                    onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                                    className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]">
                                    {(isStaff ? REQUEST_SESSION_TYPES : ATHLETE_EVENT_TYPES).map((t) => (
                                        <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                                    ))}
                                </select>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="repeat"
                                    checked={form.repeat}
                                    onChange={(e) => setForm({ ...form, repeat: e.target.checked })}
                                    className="w-4 h-4 accent-[#d5d131] cursor-pointer"
                                />
                                <label htmlFor="repeat" className="text-[#9cbcd9] text-sm cursor-pointer">
                                    Repeat weekly
                                </label>
                                {form.repeat && (
                                    <div className="flex items-center gap-2 ml-auto">
                                        <span className="text-[#9cbcd9] text-sm">for</span>
                                        <input
                                            type="number"
                                            min="2"
                                            max="52"
                                            value={form.repeatWeeks}
                                            onChange={(e) => setForm({ ...form, repeatWeeks: e.target.value })}
                                            className="w-16 bg-[#121914] border border-[#c8a84b33] rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-[#9cbcd9]"
                                        />
                                        <span className="text-[#9cbcd9] text-sm">weeks</span>
                                    </div>
                                )}
                            </div>
                            {isStaff && !isMatch &&(
                                <p className="text-[#9cbcd9] text-xs bg-[#121914] rounded-lg px-3 py-2 border border-[#c8a84b33]">
                                    This will appear as pending on the athlete's schedule until they approve it.
                                </p>
                            )}
                            {isStaff && isMatch && (
                                <p className="text-[#9cbcd9] text-xs bg-[#121914] rounded-lg px-3 py-2 border border-[#c8a84b33]">
                                    As head coach, this event will be added directly to the athlete's schedule.
                                </p>
                            )}
                            {formError && <p className="text-red-400 text-sm">{formError}</p>}
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => { setShowEventModal(false); setFormError(""); }}
                                    className="flex-1 py-2 rounded-lg border border-[#c8a84b33] text-[#9cbcd9] text-sm cursor-pointer transition-transform  hover:border-[#9cbcd9] hover:scale-103 active:scale-100 active:brightness-75">
                                    Cancel
                                </button>
                                <button onClick={handleCreateEvent} disabled={submitting}
                                    className="flex-1 py-2 rounded-lg bg-[#d5d131] text-[#121914] font-bold text-sm cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75 disabled:opacity-50">
                                    {submitting
                                        ? "Creating..."
                                        : role === "COACHING_STAFF"
                                        ? "Send Request"
                                        : form.repeat
                                        ? `Create ${form.repeatWeeks} Events`
                                        : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-8 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className={`${yesevaOne.className} text-white text-xl`}>{selectedEvent.title}</h2>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded mt-1 inline-block ${EVENT_COLORS[selectedEvent.event_type] ?? "bg-[#1a261e] text-white"}`}>
                                    {selectedEvent.event_type.charAt(0) + selectedEvent.event_type.slice(1).toLowerCase()}
                                </span>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-white text-xl cursor-pointer">×</button>
                        </div>
                        <div className="space-y-2 mb-6 text-sm">
                            <p className="text-[#9cbcd9]">
                                {new Date(selectedEvent.start_time).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                            </p>
                            <p className="text-white">
                                {new Date(selectedEvent.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                {" – "}
                                {new Date(selectedEvent.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </p>
                            {selectedEvent.status === "PENDING" && (
                                <p className="text-[#d5d131] text-xs font-semibold">Pending approval</p>
                            )}
                        </div>
                        {/* Athletes can edit/delete their own events; HEAD_COACH can edit/delete matches for linked athletes */}
                        {(role === "ATHLETE" && selectedEvent.athlete_id === userId) || role === "HEAD_COACH" && selectedEvent.event_type === "MATCH" ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => openEditModal(selectedEvent)}
                                    className="flex-1 py-2 rounded-lg bg-[#121914] text-white font-bold text-sm border border-[#c8a84b33] cursor-pointer transition-transform hover:border-[#9cbcd9] hover:scale-103 active:scale-100 active:brightness-75">
                                    Edit
                                </button>
                                <button
                                    onClick={() => setEventToDelete(selectedEvent)}
                                    className="flex-1 py-2 rounded-lg bg-red-400 text-[#121914] font-bold text-sm cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
                                    Delete
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setSelectedEvent(null)}
                                className="w-full py-2 rounded-lg border border-[#c8a84b33] text-[#9cbcd9] text-sm hover:border-[#9cbcd9] transition cursor-pointer">
                                Close
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Delete/Reject Confirmation Modal */}
            {(activeEvent) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 w-full max-w-md">
                        <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                            {eventToDelete ? "Confirm Deletion" : "Confirm Rejection"}
                        </h2>
                        <p className="text-white mb-6">
                            Are you sure you want to {eventToDelete ? "delete" : "reject"}{" "}
                            <span className="text-[#d5d131] font-semibold">{activeEvent.title}</span>
                            {" on "}
                            <span className="text-[#d5d131] font-semibold">{new Date(activeEvent.start_time).toLocaleDateString()}</span>
                            {" ?"}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setEventToDelete(null);
                                    setEventToReject(null);
                                }}
                                className="px-4 py-2 text-gray-400 hover:text-white">
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (eventToDelete) {
                                        await handleDeleteEvent(eventToDelete.id);
                                        setEventToDelete(null);
                                    } else if (eventToReject) {
                                        await handleApproveReject(eventToReject.id, "REJECT");
                                        setEventToReject(null);
                                    }
                                }}
                                className="px-4 py-2 bg-red-400 text-[#121914] rounded font-bold cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
                                {eventToDelete ? "Delete" : "Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Event Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-8 w-full max-w-md mx-4">
                        <h2 className={`${yesevaOne.className} text-white text-xl mb-6`}>Edit Event</h2>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-[#9cbcd9] text-sm mb-1 block">Title</label>
                                <input type="text" value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                            </div>
                            <div>
                                <label className="text-[#9cbcd9] text-sm mb-1 block">Date</label>
                                <input type="date" value={editForm.date}
                                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                    className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[#9cbcd9] text-sm mb-1 block">Start Time</label>
                                    <input type="time" value={editForm.startTime}
                                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                                        className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                                </div>
                                <div>
                                    <label className="text-[#9cbcd9] text-sm mb-1 block">End Time</label>
                                    <input type="time" value={editForm.endTime}
                                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                                        className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[#9cbcd9] text-sm mb-1 block">Event Type</label>
                                <select value={editForm.eventType}
                                    onChange={(e) => setEditForm({ ...editForm, eventType: e.target.value })}
                                    className="w-full bg-[#121914] border border-[#c8a84b33] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#9cbcd9]">
                                    {(role === "ATHLETE" ? ATHLETE_EVENT_TYPES : REQUEST_SESSION_TYPES).map((t) => (
                                        <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                                    ))}
                                </select>
                            </div>
                            {editError && <p className="text-red-400 text-sm">{editError}</p>}
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => { setShowEditModal(false); setEditError(""); }}
                                    className="flex-1 py-2 rounded-lg border border-[#c8a84b33] text-[#9cbcd9] text-sm cursor-pointer transition-transform  hover:border-[#9cbcd9] hover:scale-103 active:scale-100 active:brightness-75">
                                    Cancel
                                </button>
                                <button onClick={handleEditEvent} disabled={submitting}
                                    className="flex-1 py-2 rounded-lg bg-[#d5d131] text-[#121914] font-bold text-sm cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75 disabled:opacity-50">
                                    {submitting ? "Saving..." : "Save Changes"}
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
                                    className="flex-1 py-2 rounded-lg bg-[#d5d131] text-[#121914] font-bold text-sm hover:brightness-110 transition cursor-pointer disabled:opacity-50">
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
