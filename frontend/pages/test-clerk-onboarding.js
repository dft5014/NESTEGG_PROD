// pages/test-clerk-onboarding.js
import { ClerkProvider, useUser, useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/router";

function OnboardContent() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    occupation: "",
    date_of_birth: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr("");

    try {
      // 1) Update Clerk metadata (optional but nice to have in Clerk)
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          phone: form.phone || undefined,
          occupation: form.occupation || undefined,
          date_of_birth: form.date_of_birth || undefined,
          onboardedAt: new Date().toISOString(),
        },
      });

      // 2) Exchange Clerk token for NestEgg app token (your JWT)
      const clerkJwt = await getToken();
      const api = process.env.NEXT_PUBLIC_API_BASE_URL;
      const ex = await fetch(`${api}/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_jwt: clerkJwt }),
      });
      if (!ex.ok) {
        const j = await ex.json().catch(() => ({}));
        throw new Error(j.detail || `exchange failed ${ex.status}`);
      }
      const data = await ex.json();
      localStorage.setItem("token", data.access_token);

      // 3) Save fields to Supabase via a small backend helper (see FastAPI route below)
      const save = await fetch(`${api}/me/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.access_token}`,
        },
        body: JSON.stringify(form),
      });
      if (!save.ok) {
        const j = await save.json().catch(() => ({}));
        throw new Error(j.detail || `save failed ${save.status}`);
      }

      // 4) go to dashboard
      router.push("/test-clerk-dashboard");
    } catch (e) {
      setErr(e.message || String(e));
      setSaving(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h1 className="text-white text-xl font-semibold">Quick onboarding</h1>
        <p className="text-gray-400 text-sm">Add a few details so NestEgg can personalize your experience.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">First name</label>
            <input name="first_name" value={form.first_name} onChange={onChange} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Last name</label>
            <input name="last_name" value={form.last_name} onChange={onChange} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Occupation</label>
            <input name="occupation" value={form.occupation} onChange={onChange} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Date of birth</label>
          <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={onChange} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white" />
        </div>

        {err && <div className="text-red-400 text-sm">{err}</div>}

        <button disabled={saving} className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save & Continue"}
        </button>
      </form>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <OnboardContent />
    </ClerkProvider>
  );
}

// SSR passthrough
export async function getServerSideProps() { return { props: {} }; }
