import { useRouter } from "next/router";
import Image from "next/image";
import { useState } from "react";
import { useEffect } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import { getAuth } from "@/utils/getAuth";
import { get } from "http";

const lato = Lato({subsets: ["latin"], weight: ["400", "700"]})
const yesevaOne = Yeseva_One({subsets: ["latin"], weight: ["400"]})

type Profile = {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    email: string;
}

const getProfileInfoTitle = (role: string) => {
    if (role === "ATHLETE") return "Athlete Profile Info";
    if (role === "HEAD_COACH" || role === "COACHING_STAFF") return "Staff Profile Info";
    return "Profile Info";
}

const getLinkedTitle = (role: string) => {
    if (role === "ATHLETE") return "Linked Staff";
    if (role === "HEAD_COACH" || role === "COACHING_STAFF") return "Linked Athletes";
    return "Linked Users";
}

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [searchUsername, setSearchUsername] = useState("");
    const [linked, setLinked] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const fetchLinked = async (role: string) => {
        const token = localStorage.getItem("token");

        const response = await fetch("http://localhost:8000/api/auth/linked/", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            if (role === "ATHLETE") {
                setLinked(data.staff);
            } else {
                setLinked(data.athletes);
            }
        }
    };

    useEffect(() => {
        const fetchprofile = async () => {
            const response = await getAuth("http://localhost:8000/api/auth/get_profile/", {method: "GET"},  router);
            if (!response) return;
            const data = await response.json();

            if (response.ok) {
                setProfile(data.profile);
            } else {
                console.log(data.error)
            }
        };

        fetchprofile();
    }, []);

    useEffect(() => {
        if (!profile) 
            return;
        fetchLinked(profile.role);
    }, [profile]);

    const handleAdd = async () => {
        const token = localStorage.getItem("token");

        const response = await fetch("http://localhost:8000/api/auth/link/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ username: searchUsername })
        });

        console.log("URL HIT:", "http://localhost:8000/api/auth/link/");
        console.log("STATUS:", response.status);

        const data = await response.json();

        if (response.ok) {
            setErrors({linking: "Linked successfully"});
            setSearchUsername("");
            if (profile) {
                fetchLinked(profile.role); 
            }
        } else {
            setErrors({linking: "Unsuccessful"});
        }

    };

    return (
        <div className={`{lato.className} min-h-screen bg-[#121914]`}>
            <nav className="w-full flex items-center justify-between px-8 pt-2 pb-1 bg-[#1a261e] border-b border-[#c8a84b33]">
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
                    <button className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
                        Schedule
                    </button>
                    <button 
                        onClick={ () => {
                            router.push("/profile");
                        }}
                        className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer px-5 h-18 bg-[#121914] border-b border-[#c8a84b33] border-2">
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
            <div className="max-w-4xl mx-auto mt-10 px-6">

                {/* Profile Info */}
                <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 mb-6">
                    <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                        {getProfileInfoTitle(profile ? profile.role : "")}
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
                    </div>
                </div>

                {/* Linked Users */}
                <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 mb-6">
                    <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                        {getLinkedTitle(profile ? profile.role : "")}
                    </h2>
                    <ul className="space-y-2 text-white">
                        {linked.length === 0 ? (
                            <p className="text-gray-400 text-sm">No linked staff</p>
                        ) : (
                            linked.map((staff) => (
                                <li key={staff.id} className="flex justify-between">
                                    {staff.first_name} {staff.last_name}
                                    <button className="text-[#d5d131] text-sm">
                                        Remove
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* Manage Access */}
                <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 mb-10">
                    <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                    Manage Access
                    </h2>

                    <div className="flex gap-3">
                        <input
                            value={searchUsername}
                            onChange={(e) => setSearchUsername(e.target.value)}
                            placeholder="Enter username"
                            className="flex-1 px-4 py-2 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none"
                        />
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-[#9cbcd9] text-[#121914] rounded-xl font-bold cursor-pointer transition-transform hover:scale-105 active:scale-100 active:brightness-75"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}