import { useRouter } from "next/router";
import Image from "next/image";
import { useState } from "react";
import { Lato, Yeseva_One } from "next/font/google";

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

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    
    // const fetchProfile = async () => {
    //     const response = await fetch("http://localhost:8000/api/auth/signup/", {
    //         method: "POST"
    // });
    // const data = await response.json();
    // if (response.ok) {
    //   setProfile(data.profile);
    // }
    // };

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
                    Profile Info
                    </h2>

                    <div className="space-y-3 text-white">
                    <p><span className="text-[#9cbcd9]">Name:</span> First Last</p>
                    <p><span className="text-[#9cbcd9]">Username:</span> username</p>
                    <p><span className="text-[#9cbcd9]">Email:</span> username@email.com</p>
                    <p><span className="text-[#9cbcd9]">Role:</span> Athlete</p>
                    </div>
                </div>

                {/* Linked Staff */}
                <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 mb-6">
                    <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                    Linked Staff
                    </h2>

                    <ul className="space-y-2 text-white">
                    <li className="flex justify-between">
                        Coach Name
                        <button className="text-[#d5d131] text-sm">Remove</button>
                    </li>
                    <li className="flex justify-between">
                        Trainer Name
                        <button className="text-[#d5d131] text-sm">Remove</button>
                    </li>
                    </ul>
                </div>

                {/* Manage Access */}
                <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-6 mb-10">
                    <h2 className={`${yesevaOne.className} text-xl text-white mb-4`}>
                    Manage Access
                    </h2>

                    <div className="flex gap-3">
                    <input
                        placeholder="Enter staff ID"
                        className="flex-1 px-4 py-2 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none"
                    />
                    <button className="px-4 py-2 bg-[#9cbcd9] text-[#121914] rounded-xl font-bold cursor-pointer transition-transform hover:scale-105 active:scale-100 active:brightness-75">
                        Add
                    </button>
                    </div>
                </div>
            </div>
        </div>
    );
}