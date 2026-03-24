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
        </div>
    );
}