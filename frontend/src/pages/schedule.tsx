import { useRouter } from "next/router";
import Image from "next/image";
import { useState } from "react";
import { useEffect } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import { getAuth } from "@/utils/getAuth";
import Navbar from "@/components/Navbar";
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";

const lato = Lato({subsets: ["latin"], weight: ["400", "700"]})
const yesevaOne = Yeseva_One({subsets: ["latin"], weight: ["400"]})

type Event = {
    id: number;
    title: string;
    day: number;
    hour: number;
};

export default function SchedulePage() {
    const router = useRouter();
    const [schedule, setSchedule] = useState<Event[]>([]);
    const [currentWeekStart, setCurrentWeekStart] = useState(
        startOfWeek(new Date(), { weekStartsOn: 0 })
    );
    const [showEventModal, setShowEventModal] = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);
    const [selectedCell, setSelectedCell] = useState<{ day: number; hour: number } | null>(null);
    const [newEvent, setNewEvent] = useState({
        title: "",
        type: "PERSONAL",
        start: new Date(),
        end: new Date(),
        description: "",
        isMultiDay: false,
    });

    const week = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(currentWeekStart, i);
        return {
            label: format(date, "EEE"),
            dateLabel: format(date, "MMM dd"),
            fullDateLabel: format(date, "MMMM do, yyyy")
        }
    });

    const goToNextWeek = () => {
        setCurrentWeekStart((prev) => addWeeks(prev, 1));
    };

    const goToPrevWeek = () => {
        setCurrentWeekStart((prev) => subWeeks(prev, 1));
    };

    const hours = Array.from({ length: 18 }, (_, i) => i + 5);

    const formatHour = (hour: number) => {
        const period = hour >= 12 ? "PM" : "AM";
        const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${formattedHour} ${period}`;
    };

    const events: Event[] = [
        { id: 1, title: "Match", day: 1, hour: 10 },
        { id: 2, title: "Training", day: 3, hour: 14 },
        { id: 3, title: "Conditioning", day: 5, hour: 13 },
    ];

    const getEvents = (day: number, hour: number) =>
        events.filter((e) => e.day === day && e.hour === hour);

    // useEffect(() => {
    //         const fetchSchdule = async () => {
    //             const response = await getAuth("http://localhost:8000/api/auth/get_schedule/", {method: "GET"},  router);
    //             if (!response) return;
    //             const data = await response.json();
    
    //             if (response.ok) {
    //                 setSchedule(data.schedule);
    //             } else {
    //                 console.log(data.error)
    //             }
    //         };
    
    //         fetchSchedule();
    //     }, []);

    return (
        <div className={`${lato.className} min-h-screen bg-[#121914]`}>
            <Navbar/>
        
            <h1 className={`${yesevaOne.className} text-2xl border-b border-[#c8a84b33] bg-[#121914] px-8 py-6`}>
                Weekly Schedule
            </h1>

            <div className="flex">

                {/* Side Panel */}
                <div className={`bg-[#1a261e] border-r border-[#c8a84b33] transition-all duration-300 ${
                    panelOpen ? "w-64" : "w-12"
                }`}
                >
                
                    <button
                        onClick={() => setPanelOpen(prev => !prev)}
                        className="w-full text-white text-3xl p-2 hover:text-[#9cbcd9]"
                    >
                        ≡
                    </button>

                    {panelOpen && (
                        <div className="p-4 text-white">

                            <button
                                onClick={() => setShowEventModal(true)}
                                className="mb-4 hover:text-[#9cbcd9] pt-4"
                            >
                                Create +
                            </button>

                            <h3 className="font-bold mb-2 pt-10">Event Types</h3>

                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full" />
                                <span>Match</span>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                <span>Practice</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full" />
                                <span>Meeting</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 items-center  text-[#9cbcd9]">
                    <div className="flex bg-[#1a261e] px-8 py-3 items-center gap-4">
                        {/* Arrows */}
                        <div className="flex gap-1">
                            <button 
                                onClick={goToPrevWeek}
                                className="px-3 hover:text-white text-lg font-bold"
                            >
                                &lt;
                            </button>

                            <button 
                                onClick={goToNextWeek}
                                className="px-3 hover:text-white text-lg font-bold"
                            >
                                &gt;
                            </button>
                        </div>
                        
                        {/* Current Week */}
                        <h2 className="text-m font-semibold">
                            {week[0].fullDateLabel} - {week[6].fullDateLabel}
                        </h2>

                        {/* Today */}
                        <button
                            onClick={() =>
                                setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
                            }
                            className="ml-auto px-4 py-1 rounded-lg bg-[#9cbcd9] text-[#121914] font-semibold cursor-pointer transition-transform hover:scale-105 active:scale-100 active:brightness-75"
                        >
                            Today
                        </button>
                    </div>
                
                {/* Grid */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] border border-[#c8a84b33] px-8 py-6">

                    {/* Top-Left Empty Cell */}
                    <div className="border-r border-b border-[#c8a84b33] max-w-[100px] p-2"></div>

                    {/* Days */}
                    {week.map((day, i) => (
                        <div key={i} className="text-center border-r border-b border-[#c8a84b33] p-2">
                            <div className={`${yesevaOne.className} text-lg font-bold`}>{day.label}</div>
                            <div className="text-sm text-gray-400">{day.dateLabel}</div>
                        </div>
                    ))}

                    {/* Times */}
                    {hours.map((hour) => (
                        <>
                            <div className="text-sm text-gray-400 border-r border-b border-[#c8a84b33] px-3 py-1 min-h-[60px] max-w-[100px] flex items-start justify-end">
                                {formatHour(hour)}
                            </div>

                            {/* Cells */}
                            {week.map((_, dayIndex) => (
                                <div 
                                    key={`${dayIndex}-${hour}`}
                                    onClick={() => {
                                        const date = addDays(currentWeekStart, dayIndex);
                                        date.setHours(hour, 0, 0, 0);

                                        const end = new Date(date);
                                        end.setHours(hour + 1);

                                        setNewEvent({
                                            title: "",
                                            type: "PERSONAL",
                                            start: date,
                                            end: end,
                                            description: "",
                                            isMultiDay: false
                                        });

                                        setShowEventModal(true);
                                    }}
                                    className="border-r border-b border-[#c8a84b33] p-2 min-h-[60px] bg-[#121914] w-full min-w-0"
                                >
                                    {getEvents(dayIndex, hour).map((event) => (
                                        <div
                                            key={event.id} className="break-words whitespace-normal">
                                            {event.title}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </>
                    ))}
                </div>
            </div>
            </div>

            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    
                    <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 w-full max-w-md">
                        
                        {/* Header */}
                        <h2 className={`${yesevaOne.className} text-2xl text-white mb-4`}>
                            Create Event
                        </h2>

                        {/* Form */}
                        <div className="flex flex-col gap-3">

                            <input
                                placeholder="Title"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                className="px-3 py-2 bg-[#121914] border border-[#c8a84b33] rounded text-white"
                            />

                            <select
                                value={newEvent.type}
                                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                                className="px-3 py-2 bg-[#121914] border border-[#c8a84b33] rounded text-white"
                            >
                                <option value="PERSONAL">Personal</option>
                                <option value="TRAINING">Training</option>
                                <option value="MATCH">Match</option>
                            </select>

                            {/* Start Date */}
                            <input
                                type="date"
                                value={format(newEvent.start, "yyyy-MM-dd")}
                                onChange={(e) => {
                                    const newDate = new Date(e.target.value);
                                    const updated = new Date(newEvent.start);
                                    updated.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                                    setNewEvent({ ...newEvent, start: updated });
                                }}
                                className="px-3 py-2 bg-[#121914] border border-[#c8a84b33] rounded text-white"
                            />

                            {/* Start Time */}
                            <input
                                type="time"
                                value={format(newEvent.start, "HH:mm")}
                                onChange={(e) => {
                                    const [h, m] = e.target.value.split(":");
                                    const updated = new Date(newEvent.start);
                                    updated.setHours(Number(h), Number(m));
                                    setNewEvent({ ...newEvent, start: updated });
                                }}
                                className="px-3 py-2 bg-[#121914] border border-[#c8a84b33] rounded text-white"
                            />

                            {/* End Date */}
                            <input
                                type="date"
                                value={format(newEvent.end, "yyyy-MM-dd")}
                                onChange={(e) => {
                                    const newDate = new Date(e.target.value);
                                    const updated = new Date(newEvent.end);
                                    updated.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                                    setNewEvent({ ...newEvent, end: updated });
                                }}
                                className="px-3 py-2 bg-[#121914] border border-[#c8a84b33] rounded text-white"
                            />
                            
                            {/* End Time */}
                            <input
                                type="time"
                                value={format(newEvent.end, "HH:mm")}
                                onChange={(e) => {
                                    const [h, m] = e.target.value.split(":");
                                    const updated = new Date(newEvent.end);
                                    updated.setHours(Number(h), Number(m));
                                    setNewEvent({ ...newEvent, end: updated });
                                }}
                                className="px-3 py-2 bg-[#121914] border border-[#c8a84b33] rounded text-white"
                            />

                            <textarea
                                placeholder="Description (optional)"
                                value={newEvent.description}
                                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                className="px-3 py-2 bg-[#121914] border border-[#c8a84b33] rounded text-white"
                            />

                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowEventModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    setShowEventModal(false);
                                }}
                                className="px-4 py-2 bg-[#9cbcd9] text-[#121914] rounded font-bold cursor-pointer transition-transform hover:scale-105 active:scale-100 active:brightness-75"
                            >
                                Save
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

