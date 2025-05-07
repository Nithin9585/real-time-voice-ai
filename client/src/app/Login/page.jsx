'use client';

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { handleLogin as loginUser } from "../../../utils/auth";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setLoggedInUser(data.user);
      }
    };
    getUser();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const user = await loginUser(email, password);
    if (user) {
      setLoggedInUser(user);
      alert("Logged in successfully!");
      router.push("/");
    } else {
      setError("Login failed. Try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-6">
      <h2 className="text-3xl font-semibold text-gray-700 mb-6">Login</h2>

      {loggedInUser && (
        <div className="mb-4 text-green-600 font-medium">
          Logged in as: {loggedInUser.email}
        </div>
      )}

      <form
        onSubmit={handleFormSubmit}
        className="border-2 rounded-xl shadow-md px-8 pt-6 pb-8 w-full max-w-sm"
      >
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6 relative">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-gray-300 rounded pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-500"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm italic mb-4">{error}</p>}

        <button
          type="submit"
          className="bg-gray-800 hover:bg-black text-white font-semibold py-2 px-4 rounded w-full"
        >
          Login
        </button>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Don't have an account?{" "}
          <Link href="/Signin" className="text-gray-800 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
