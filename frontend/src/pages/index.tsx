import Image from "next/image";
import { useState } from "react";
import { Lato } from "next/font/google";
import { Eye, EyeOff } from "lucide-react";

const lato = Lato({subsets: ["latin"], weight: ["400", "700"]})
 
export default function LoginSignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({
    username: "", 
    first_name: "", 
    last_name: "", 
    email: "", 
    password: "", 
    verify_password: "",
    role: ""
  });
  const [error, setError] = useState("");

  const handleSubmit = async () =>{
    // Need URL
    const response = await fetch("http://localhost:?", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(form),
    });
    const result = await response.json();
  }

  return (
    <div className={`${lato.className} flex flex-col min-h-screen items-center justify-center bg-[#1a261e] pb-16`}>
  
      <Image
        src="/CourtIQlogo.png"
        alt="CourtIQ Logo"
        width={500}
        height={200}
        priority
      />

      <div className="flex flex-col gap-4 w-full max-w-sm">

        {isSignUp && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">Role</label>
              <select 
                value={form.role}
                onChange={evt => setForm(prev => ({...prev, role: evt.target.value}))}
                className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white cursor-pointer appearance-none">
                <option value="">Select a role</option>
                <option value="athlete">Athlete</option>
                <option value="headCoach">Head Coach</option>
                <option value="coachingStaff">Coaching Staff</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">First Name</label>
              <input
                placeholder="Enter first name"
                value={form.first_name}
                onChange={evt => setForm(prev => ({...prev, first_name: evt.target.value}))}
                className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">Last Name</label>
              <input
                placeholder="Enter last name"
                value={form.last_name}
                onChange={evt => setForm(prev => ({...prev, last_name: evt.target.value}))}
                className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">Email</label>
              <input
                placeholder="Enter email"
                type="email"
                value={form.email}
                onChange={evt => setForm(prev => ({...prev, email: evt.target.value}))}
                className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-white text-sm">Username</label>
          <input
            placeholder={isSignUp ? "Create username" : "Enter username"}
            value={form.username}
            onChange={evt => setForm(prev => ({...prev, username: evt.target.value}))}
            className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-white text-sm">Password</label>
          <div className="relative">
            <input
              placeholder={isSignUp ? "Create password" : "Enter password"}
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={evt => setForm(prev => ({...prev, password: evt.target.value}))}
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

        {isSignUp && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">Confirm Password</label>
              <div className="relative">
                <input
                  placeholder="Confirm password"
                  type={showPassword ? "text" : "password"}
                  value={form.verify_password}
                onChange={evt => setForm(prev => ({...prev, verify_password: evt.target.value}))}
                  className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white"
                />
              </div>
            </div>
          </>
        )}

        <button 
          className="w-full py-3 bg-[#9cbcd9] text-[#121914] rounded-xl font-bold text-sm tracking-widest cursor-pointer mt-2 transition-transform hover:scale-103 active:scale-100 active:brightness-75">
          {isSignUp ? "SIGN UP" : "LOG IN"}
        </button>

        <div className="text-center text-white text-sm mt-2">
          {isSignUp ? "Already have an account?" : "Don't have an account?"} 
          <button
            onClick={() => setIsSignUp(p => !p)}
            className="text-[#9cbcd9] font-bold bg-transparent border-none cursor-pointer transition-transform hover:scale-105 active:scale-100 active:brightness-75 ml-2">
            {isSignUp ? "Log In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
