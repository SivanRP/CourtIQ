import { useRouter } from "next/router";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import { getAuth } from "@/utils/getAuth";

const lato = Lato({ subsets: ["latin"], weight: ["400", "700"] });
const yesevaOne = Yeseva_One({ subsets: ["latin"], weight: ["400"] });

type Profile = {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    email: string;
};

type LinkedUser = {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
};

const getProfileInfoTitle = (role: string) => {
    if (role === "ATHLETE") return "Athlete Profile Info";
    if (role === "HEAD_COACH" || role === "COACHING_STAFF") return "Staff Profile Info";
    return "Profile Info";
};

const getLinkedTitle = (role: string) => {
    if (role === "ATHLETE") return "Linked Staff";
    if (role === "HEAD_COACH" || role === "COACHING_STAFF") return "Linked Athletes";
    return "Linked";
};

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [searchUsername, setSearchUsername] = useState("");
    const [linked, setLinked] = useState<LinkedUser[]>([]);
    const [loadingLinked, setLoadingLinked] = useState(true);
    const [linkMessage, setLinkMessage] = useState("");
    const [linkError, setLinkError] = useState(false);

    const fetchLinked = async (role: string) => {
        setLoadingLinked(true);
        const res = await getAuth("http://127.0.0.1:8000/api/auth/linked/", { method: "GET" }, router);
        if (res?.ok) {
            const data = await res.json();
            setLinked(role === "ATHLETE" ? (data.staff || []) : (data.athletes || []));
        }
        setLoadingLinked(false);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            const res = await getAuth("http://127.0.0.1:8000/api/auth/get_profile/", { method: "GET" }, router);
            if (res?.ok) {
                const data = await res.json();
                setProfile(data.profile);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!profile) return;
        fetchLinked(profile.role);
    }, [profile]);

    const handleAdd = async () => {
        if (!searchUsername.trim()) return;
        const res = await getAuth("http://127.0.0.1:8000/api/auth/link/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: searchUsername }),
        }, router);
        const data = await res?.json();
        if (res?.ok) {
            setLinkMessage("Linked successfully.");
            setLinkError(false);
            setSearchUsername("");
            if (profile) fetchLinked(profile.role);
        } else {
            setLinkMessage(data?.error || "Failed to link user.");
            setLinkError(true);
        }
    };

    const handleRemove = async (userId: string) => {
        if (!profile) return;
        const isStaff = profile.role === "HEAD_COACH" || profile.role === "COACHING_STAFF";
        const body = isStaff ? { athlete_id: userId } : { staff_id: userId };
        const res = await getAuth("http://127.0.0.1:8000/api/auth/unlink/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }, router);
        if (res?.ok) {
            fetchLinked(profile.role);
        }
    };

    return (
        <div className={`${lato.className} min-h-screen bg-[#121914]`}>
            <nav className="w-full flex items-center justify-between px-8 pt-2 pb-1 bg-[#1a261e] border-b border-[#c8a84b33]">
                <Image src="/CourtIQlogo.png" alt="CourtIQ Logo" width={187.5} height={75} priority />
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push("/dashboard")}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Dashboard
                    </button>
                    <button onClick={() => router.push("/schedule")}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Schedule
                    </button>
                    <button onClick={() => router.push("/profile")}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer px-5 h-18 bg-[#121914] border-b border-[#c8a84b33] border-2">
                        Profile
                    </button>
                    <button onClick={() => { localStorage.removeItem("token"); router.push("/"); }}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Log Out
                    </button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto mt-10 px-6">
                {/* Profile Info */}
                <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 mb-6">
                    <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                        {getProfileInfoTitle(profile?.role ?? "")}
                    </h2>
                    <div className="space-y-3 text-white">
                        <p>
                            <span className="text-[#9cbcd9]">Name:</span>{" "}
                            {profile ? `${profile.first_name} ${profile.last_name}` : "..."}
                        </p>
                        <p>
                            <span className="text-[#9cbcd9]">Username:</span>{" "}
                            {profile?.username || "..."}
                        </p>
                        <p>
                            <span className="text-[#9cbcd9]">Email:</span>{" "}
                            {profile?.email || "..."}
                        </p>
                        <p>
                            <span className="text-[#9cbcd9]">Role:</span>{" "}
                            {profile?.role ? profile.role.replace("_", " ") : "..."}
                        </p>
                    </div>
                </div>

                {/* Linked Users */}
                <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 mb-6">
                    <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                        {getLinkedTitle(profile?.role ?? "")}
                    </h2>
                    {loadingLinked ? (
                        <p className="text-gray-400 text-sm">Loading...</p>
                    ) : linked.length === 0 ? (
                        <p className="text-gray-400 text-sm">No linked users yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {linked.map((user) => (
                                <li key={user.id} className="flex items-center justify-between text-white py-2 border-b border-[#c8a84b22] last:border-0">
                                    <div>
                                        <span className="font-semibold">{user.first_name} {user.last_name}</span>
                                        <span className="text-[#9cbcd9] text-sm ml-2">@{user.username}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(user.id)}
                                        className="text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer">
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Manage Access */}
                <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 mb-10">
                    <h2 className={`${yesevaOne.className} text-xl text-white mb-2`}>Manage Access</h2>
                    <p className="text-[#9cbcd9] text-sm mb-4">
                        {profile?.role === "ATHLETE"
                            ? "Enter a coach or staff username to give them access to your profile."
                            : "Enter an athlete's username to link them to your account."}
                    </p>
                    <div className="flex gap-3">
                        <input
                            value={searchUsername}
                            onChange={(e) => setSearchUsername(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            placeholder="Enter username"
                            className="flex-1 px-4 py-2 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none focus:border-[#9cbcd9]"
                        />
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-[#9cbcd9] text-[#121914] rounded-xl font-bold cursor-pointer hover:brightness-110 transition">
                            Add
                        </button>
                    </div>
                    {linkMessage && (
                        <p className={`mt-2 text-sm ${linkError ? "text-red-400" : "text-green-400"}`}>
                            {linkMessage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
