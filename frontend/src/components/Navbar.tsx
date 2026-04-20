import { useRouter } from "next/router";
import Image from "next/image";
import { Lato } from "next/font/google";

const lato = Lato({subsets: ["latin"], weight: ["400", "700"]})

export default function Navbar() {
    const router = useRouter();

    const isActive = (path: string) => router.asPath === path;

    const buttonClass = (active: boolean) =>
        `text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer 
        ${active? "px-5 h-18 bg-[#121914] border-b border-[#c8a84b33] border-2" : "bg-transparent border-none"}`;

    return (
        <nav className={`${lato.className} w-full flex items-center justify-between px-8 pt-2 pb-1 bg-[#1a261e] border-b border-[#c8a84b33]`}>
            
            <Image
                src="/CourtIQlogo.png"
                alt="CourtIQ Logo"
                width={187.5}
                height={75}
                priority
            />

            <div className="flex items-center gap-6">
                
                <button
                    onClick={() => router.push("/dashboard")}
                    className={buttonClass(isActive("/dashboard"))}
                >
                    Dashboard
                </button>

                <button
                    onClick={() => router.push("/schedule")}
                    className={buttonClass(isActive("/schedule"))}
                >
                    Schedule
                </button>

                <button
                    onClick={() => router.push("/profile")}
                    className={buttonClass(isActive("/profile"))}
                >
                    Profile
                </button>

                <button
                    onClick={() => {
                        localStorage.removeItem("token");
                        router.push("/");
                    }}
                    className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none"
                >
                    Log Out
                </button>

            </div>
        </nav>
    );
}