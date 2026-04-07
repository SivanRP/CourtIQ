import { useRouter } from "next/router";
import { Lato, Yeseva_One } from "next/font/google";
import Image from "next/image"

const lato = Lato({subsets: ["latin"], weight: ["400", "700"]})
const yesevaOne = Yeseva_One({subsets: ["latin"], weight: ["400"]})

export default function Dashboard() {
    const router = useRouter();

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
                    <button className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer px-5 h-18 bg-[#121914] border-b border-[#c8a84b33] border-2">
                        Dashboard
                    </button>
                    <button className="text-white text-m hover:text-[#9cbcd9] transition-colors cursor-pointer bg-transparent border-none">
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

            <div className="flex flex-col items-center justify-center mt-20">
                <h1 className={`${yesevaOne.className} text-white text-3xl`}>
                    Welcome to CourtIQ!
                </h1>
                <h2 className="text-[#9cbcd9] mt-4 text-xl">
                    Dashboard coming soon...
                </h2>
            </div>
        </div>
    )
}