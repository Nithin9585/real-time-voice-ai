// utils/auth.js
import { supabase } from "../lib/supabaseClient";

export const handleSignup = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  console.log("Signup data:", data);

  if (error) {
    console.error("Signup error:", error.message);
    return null;
  }

  const session = data.session;
  console.log("Session data:", session);

  if (session) {
    await fetch('/api/set-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    });
  }

  return data.user;
};
export const handleLogin = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login error:", error.message);
    return null;
  }

  const session = data.session;
  console.log("Login session:", session);

  if (session) {
    await fetch("/api/set-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
    });
  }

  return data.user;
};


export async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Logout error:', error.message);
  } else {
    console.log('✅ User logged out successfully');
  }
}
