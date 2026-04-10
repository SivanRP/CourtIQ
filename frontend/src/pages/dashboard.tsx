import { useRouter } from "next/router";
import { Lato, Yeseva_One } from "next/font/google";
import Image from "next/image"
import Navbar from "@/components/Navbar";

const lato = Lato({subsets: ["latin"], weight: ["400", "700"]})
const yesevaOne = Yeseva_One({subsets: ["latin"], weight: ["400"]})

export default function Dashboard() {
    const router = useRouter();
    
    return (
        <div className={`${lato.className} min-h-screen bg-[#121914]`}>
            <Navbar/>

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