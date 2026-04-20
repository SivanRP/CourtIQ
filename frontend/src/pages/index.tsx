import { useRouter } from "next/router";
import Image from "next/image";
import { useState } from "react";
import { Lato, Yeseva_One } from "next/font/google";
import { Eye, EyeOff } from "lucide-react";

const lato = Lato({subsets: ["latin"], weight: ["400", "700"]})
const yesevaOne = Yeseva_One({subsets: ["latin"], weight: ["400"]})

export default function LoginSignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({username: "", first_name: "", last_name: "", email: "", password: "", verify_password: "", role: ""});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const handleSubmit = async () => {
    setErrors({});
    if (isSignUp) {
    const response = await fetch("http://localhost:8000/api/auth/signup/", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (response.ok) {
      setIsSignUp(false);
      setForm({username: "", first_name: "", last_name: "", email: "", password: "", verify_password: "", role: ""});
      setSuccess("Signup successful");
    } else {
      if (result.error == "Username is not unique") {
        setErrors({username: "* Username is already taken *"});
      } else if (result.error == "Password is not valid") {
        setErrors({password: "* Password must be 6+ characters & include uppercase, lowercase, numbers, & special characters (. ; : , - ! ?) *"});
      } else if (result.error == "Passwords don't match") {
        setErrors({verify_password: "* Passwords don't match *"});
      } else if (result.error == "All fields are required") {
        setErrors({general: "* Please fill in all fields *"});
      } else if (result.error == "Failed to save profile") {
        setErrors({general: "* Something went wrong, please try again *"});
      }
    }
  } else {
    const response = await fetch("http://localhost:8000/api/auth/login/", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({username: form.username, password: form.password}),
    });
    const result = await response.json();
    if (response.ok) {
      const token = result.token;
      localStorage.setItem("token", token);
      router.push("/dashboard");
    } else {
      if (result.error == "Invalid username") {
        setErrors({username: "* An account with this username does not exist *"})
      } else if (result.error == "Invalid credentials") {
        setErrors({password: "* Incorrect password *"})
      } else {
        setErrors({general: "* Invalid username or password *"})
      }
    }
  }};

  const handleForgotPassword = async () => {
    setErrors({});
    const response = await fetch("http://localhost:8000/api/auth/reset_password/", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({email: form.email}),
    });
    const result = await response.json();
    if (response.ok) {
      setShowForgotPassword(false);
      setSuccess("Password reset email sent successfully!");
    } else {
      setErrors({general: "* " + result.error + " *"})
    }
  };

  return (
    <div className={`${lato.className} flex flex-col min-h-screen items-center justify-center bg-[#1a261e] pb-16`}>
  
      <Image
        src="/CourtIQlogo.png"
        alt="CourtIQ Logo"
        width={500}
        height={200}
        priority
        className="mt-6"
      />

      <h2 className={`${yesevaOne.className} text-white font-bold text-2xl -mt-13 mb-4 w-full max-w-sm`}>
        {isSignUp ? "Sign up to begin!" : "Welcome back!"}
      </h2>

      <div className="flex flex-col gap-4 w-full max-w-sm">

        {isSignUp && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">Role</label>
              <select 
                value={form.role}
                onChange={evt => {setForm(prev => ({...prev, role: evt.target.value})); evt.target.blur();}}
                className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white focus:border-2 cursor-pointer appearance-none">
                <option value="">Select a role</option>
                <option value="ATHLETE">Athlete</option>
                <option value="HEAD_COACH">Head Coach</option>
                <option value="COACHING_STAFF">Coaching Staff</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">First Name</label>
              <input
                placeholder="Enter first name"
                value={form.first_name}
                onChange={evt => setForm(prev => ({...prev, first_name: evt.target.value}))}
                onKeyDown={evt => {if (evt.key == "Enter") evt.currentTarget.blur()}}
                className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white focus:border-2"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">Last Name</label>
              <input
                placeholder="Enter last name"
                value={form.last_name}
                onChange={evt => setForm(prev => ({...prev, last_name: evt.target.value}))}
                onKeyDown={evt => {if (evt.key == "Enter") evt.currentTarget.blur()}}
                className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white focus:border-2"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">Email</label>
              <input
                placeholder="Enter email"
                type="email"
                value={form.email}
                onChange={evt => setForm(prev => ({...prev, email: evt.target.value}))}
                onKeyDown={evt => {if (evt.key == "Enter") evt.currentTarget.blur()}}
                className="w-full px-4 py-3 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white focus:border-2"
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
            onKeyDown={evt => {if (evt.key == "Enter") evt.currentTarget.blur()}}
            className={`w-full px-4 py-3 bg-[#121914] border rounded-xl text-white outline-none hover:border-white focus:border-white focus:border-2 ${errors.username ? "border-[#d5d131]" : "border-[#c8a84b33]"}`}
          />
          {errors.username && <p className="text-[#d5d131] text-xs mt-1"> {errors.username}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-white text-sm">Password</label>
          <div className="relative">
            <input
              placeholder={isSignUp ? "Create password" : "Enter password"}
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={evt => setForm(prev => ({...prev, password: evt.target.value}))}
              onKeyDown={evt => {if (evt.key == "Enter") {handleSubmit(); evt.currentTarget.blur()}}}
              className={`w-full px-4 py-3 bg-[#121914] border rounded-xl text-white outline-none hover:border-white focus:border-white focus:border-2 ${errors.password ? "border-[#d5d131]" : "border-[#c8a84b33]"}`}
            />
            <button
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9cbcd9] cursor-pointer transition-transform hover:scale-105 hover:text-white active:scale-100 active:text-[#9cbcd9]"
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
            {!isSignUp && (
              <button
                onClick={() => setShowForgotPassword(true)}
                className="absolute right-1 -mt-5 text-[#9cbcd9] text-xs font-bold text-right cursor-pointer transition-transform hover:scale-103 active:scale-100 origin-right active:brightness-75">
                Forgot Password?
              </button>
            )}
          </div>
          {errors.password && <p className="text-[#d5d131] text-xs mt-1"> {errors.password}</p>}
        </div>

        {isSignUp && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-white text-sm">Confirm Password</label>
              <input
                placeholder="Confirm password"
                type={showPassword ? "text" : "password"}
                value={form.verify_password}
                onChange={evt => setForm(prev => ({...prev, verify_password: evt.target.value}))}
                onKeyDown={evt => {if (evt.key == "Enter") {handleSubmit(); evt.currentTarget.blur()}}}
                className={`w-full px-4 py-3 bg-[#121914] border rounded-xl text-white outline-none hover:border-white focus:border-white focus:border-2 ${errors.verify_password ? "border-[#d5d131]" : "border-[#c8a84b33]"}`}
              />
              {errors.verify_password && <p className="text-[#d5d131] text-xs mt-1"> {errors.verify_password}</p>}
            </div>
          </>
        )}

        {errors.general && <p className="text-[#d5d131] text-xs mt-1"> {errors.general}</p>}

        <button 
          onClick={handleSubmit}
          className="w-full py-3 bg-[#9cbcd9] text-[#121914] rounded-xl font-bold text-sm tracking-widest mt-2 cursor-pointer transition-transform hover:brightness-110 hover:scale-103 active:scale-100 active:brightness-75">
          {isSignUp ? "SIGN UP" : "LOG IN"}
        </button>

        <div className="text-center text-white text-sm mt-2">
          {isSignUp ? "Already have an account?" : "Don't have an account?"} 
          <button
            onClick={() => {
              setIsSignUp(p => !p);
              setForm({username: "", first_name: "", last_name: "", email: "", password: "", verify_password: "", role: ""});
              setErrors({});
              setShowPassword(false);
            }}
            className="text-[#9cbcd9] font-bold bg-transparent border-none cursor-pointer transition-transform hover:scale-105 active:scale-100 active:brightness-75 ml-2">
            {isSignUp ? "Log In" : "Sign Up"}
          </button>
        </div>
      </div>

      {success && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-11 w-[90%] max-w-100 text-center shadow-xl">
            <h3 className={`${yesevaOne.className} text-white text-lg font-bold mb-2`}>
              {success}
            </h3>
            <p className="text-[#9cbcd9] text-sm mb-6">
              Please click continue to proceed to login.
            </p>
            <button
              onClick={() => setSuccess("")}
              className="px-4 py-2 bg-[#9cbcd9] text-[#121914] rounded-lg font-bold text-sm hover:scale-105 transition">
              Continue
            </button>
          </div>
        </div>
      )}

      {showForgotPassword && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-[#1a261e] border border-[#c8a84b33] rounded-2xl p-11 w-[90%] max-w-100 text-center shadow-xl">
              <h2 className={`${yesevaOne.className} text-white text-lg mb-4`}>Reset Password</h2>
              <input
                placeholder="Enter your email"
                onChange={(e) => setForm(prev => ({...prev, email: e.target.value}))}
                onKeyDown={evt => {if (evt.key == "Enter") evt.currentTarget.blur()}}
                className="w-full px-4 py-3 mb-1 bg-[#121914] border border-[#c8a84b33] rounded-xl text-white outline-none hover:border-white focus:border-white focus:border-2"
              />
              <button
                onClick={handleForgotPassword}
                className="w-full py-3 bg-[#9cbcd9] text-[#121914] rounded-xl font-bold text-sm tracking-widest cursor-pointer mt-2 transition-transform hover:scale-102 active:scale-100 active:brightness-75">
                Send Reset Link
              </button>
              <button
                onClick={() => setShowForgotPassword(false)}
                className = "text-sm text-gray-400 hover:text-white mt-3">
                Cancel
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
