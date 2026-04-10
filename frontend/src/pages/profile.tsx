import { useRouter } from "next/router";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import { getAuth } from "@/utils/getAuth";
import Navbar from "@/components/Navbar";
import { get } from "http";

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
    const [userToRemove, setUserToRemove] = useState<LinkedUser | null>(null);

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

            <Navbar/>

            <div className="max-w-4xl mx-auto mt-10 px-6">
                {/* Profile Info */}
                <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 mb-6">
                    <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                        {getProfileInfoTitle(profile?.role ?? "")}
                    </h2>
                    <div className="space-y-3 text-white">
                        <p>
                            <span className="text-[#9cbcd9] font-semibold pr-2">Name:</span>
                            {profile ? `${profile.first_name} ${profile.last_name}` : "..."}
                        </p>
                        <p>
                            <span className="text-[#9cbcd9] font-semibold pr-1">Username:</span>
                            {profile?.username || "..."}
                        </p>
                        <p>
                            <span className="text-[#9cbcd9] font-semibold pr-2">Email:</span>
                            {profile?.email || "..."}
                        </p>
                        <p>
                            <span className="text-[#9cbcd9] font-semibold pr-2">Role:</span>
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
                                <li key={user.id} className="flex items-center justify-between text-white py-2 border-b border-[#c8a84b33] last:border-0">
                                    <div>
                                        <span className="font-semibold">{user.first_name} {user.last_name}</span>
                                        <span className="text-[#d5d131] text-sm ml-2">@{user.username}</span>
                                    </div>
                                    <button
                                        onClick={() => setUserToRemove(user)}
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
                            className="px-4 py-2 bg-[#9cbcd9] text-[#121914] rounded-xl font-bold cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
                            Add
                        </button>
                    </div>
                    {linkMessage && (
                        <p className={`mt-2 text-sm ${linkError ? "text-red-400" : "text-[#d5d131]"}`}>
                            {linkMessage}
                        </p>
                    )}
                </div>
            </div>

            {userToRemove && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 w-full max-w-md">
                        <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                            Confirm Removal
                        </h2>
                        <p className="text-white mb-6">
                            Are you sure you want to remove{" "}
                            <span className="text-[#d5d131] font-semibold">{userToRemove.first_name} {userToRemove.last_name}</span>
                            ?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setUserToRemove(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white">
                                Cancel
                            </button>
                            <button
                                onClick={async () => {await handleRemove(userToRemove.id); setUserToRemove(null);}}
                                className="px-4 py-2 bg-red-400 text-[#121914] rounded font-bold cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
