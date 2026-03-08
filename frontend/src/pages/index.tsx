import Image from "next/image";
import { useState } from "react";
import { Lato } from "next/font/google";
import { Eye, EyeOff } from "lucide-react";

const lato = Lato({subsets: ["latin"], weight: ["400", "700"]})
 
export default function LoginSignupPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`${lato.className} flex flex-col min-h-screen items-center justify-center bg-[#1a261e]`}>
  
      <Image
        src="/CourtIQlogo.png"
        alt="CourtIQ Logo"
        width={500}
        height={200}
        priority
      />

      <div className="flex flex-col gap-4 w-full max-w-sm mt-2">

        <div className="flex flex-col gap-1">
          <label className="text-white text-sm">Username</label>
          <input
            placeholder="Enter username"
            className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-white text-sm">Password</label>
          <div className="relative">
            <input
              placeholder="Enter password"
              type={showPassword ? "text" : "password"}
              className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white"
            />
            <button
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9cbcd9] cursor-pointer transition-transform hover:scale-105 hover:text-white active:scale-100 active:text-[#9cbcd9]"
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>

        <button className="w-full py-3 bg-[#9cbcd9] text-[#121914] rounded-xl font-bold text-sm tracking-widest uppercase cursor-pointer mt-2 transition-transform hover:scale-103 active:scale-100 active:brightness-75">
          Login
        </button>

        <p className="text-center text-white text-sm mt-2">
          Don't have an account?{" "}
          <button className="text-[#9cbcd9] font-bold bg-transparent border-none cursor-pointer transition-transform hover:scale-105 active:scale-100 active:brightness-75 ml-2">
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
