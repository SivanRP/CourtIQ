import { useRouter } from "next/router";
import Image from "next/image";
import { useState } from "react";
import { useEffect } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import { getAuth } from "@/utils/getAuth";
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";

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
        <div className={`{lato.className} min-h-screen bg-[#121914]`}>
            <nav className="w-full flex items-center justify-between px-8 pt-2 pb-1 bg-[#1a261e]">
                <Image
                    src="/CourtIQlogo.png"
                    alt="CourtIQ Logo"
                    width={187.5}
                    height={75}
                    priority
                />
            
                <div className="flex items-center gap-6">
                    <button 
                        onClick={ () => {
                            router.push("/dashboard");
                        }}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Dashboard
                    </button>
                    <button 
                        onClick={ () => {
                            router.push("/schedule");
                        }}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer px-5 h-18 bg-[#121914] border-b border-[#c8a84b33] border-2">
                        Schedule
                    </button>
                    <button 
                        onClick={ () => {
                            router.push("/profile");
                        }}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Profile
                    </button>
                    <button 
                        onClick={ () => {
                            localStorage.removeItem("token");
                            router.push("/");
                        }}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Log Out
                    </button>
                </div>
            </nav>
        
            <h1 className="text-2xl font-bold border-b border-[#c8a84b33] bg-[#121914] px-8 py-6">Weekly Schedule</h1>

            <div className="flex items-center bg-[#1a261e] px-8 py-3 text-[#9cbcd9]">
                <div className="flex items-center gap-4">
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
                </div>

                {/* Today */}
                <button
                    onClick={() =>
                        setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
                    }
                    className="ml-auto px-4 py-1 rounded-lg bg-[#9cbcd9] text-[#121914] font-semibold hover:brightness-110 active:scale-95 transition"
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
                        <div className="text-lg font-bold">{day.label}</div>
                        <div className="text-sm text-gray-400">{day.dateLabel}</div>
                    </div>
                ))}

                {/* Times */}
                {hours.map((hour) => (
                    <>
                        <div className="text-sm text-gray-400 border-r border-b border-[#c8a84b33] p-2 min-h-[60px] max-w-[100px] flex items-center justify-end pr-3">
                            {formatHour(hour)}
                        </div>

                        {week.map((_, dayIndex) => (
                            <div 
                                key={`${dayIndex}-${hour}`}
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
    );
}