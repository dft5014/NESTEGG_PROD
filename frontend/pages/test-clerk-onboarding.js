// pages/test-clerk-onboarding.js
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function TestClerkOnboarding() {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} appearance={{ baseTheme: "dark" }}>
      <OnboardContent />
    </ClerkProvider>
  );
}

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
  const [apiError, setApiError] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    setForm({
      first_name: user.firstName || "",
      last_name: user.lastName || "",
      phone: user.unsafeMetadata?.phone || "",
      occupation: user.unsafeMetadata?.occupation || "",
      date_of_birth: user.unsafeMetadata?.date_of_birth || "",
    });
  }, [isLoaded, user]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setApiError("");

    try {
      // 1) Update Clerk metadata
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          phone: form.phone || undefined,
          occupation: form.occupation || undefined,
          date_of_birth: form.date_of_birth || undefined,
          plan: user?.unsafeMetadata?.plan || "free",
          onboardedAt: new Date().toISOString(),
        },
      });

      // 2) Exchange Clerk token → app token (also ensures Supabase user row)
      const cJwt = await getToken();
      const base = process.env.NEXT_PUBLIC_API_URL;
      if (!base) throw new Error("Missing NEXT_PUBLIC_API_URL");
      const ex = await fetch(`${base}/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_jwt: cJwt }),
      });
      if (!ex.ok) throw new Error(`Token exchange failed: ${ex.status} ${await ex.text()}`);
      const data = await ex.json();
      localStorage.setItem("token", data.access_token);

      // 3) Save profile fields into NestEgg
      const save = await fetch(`${base}/me/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.access_token}` },
        body: JSON.stringify(form),
      });
      if (!save.ok) throw new Error(`Onboard save failed: ${save.status} ${await save.text()}`);

      setOk(true);
      setTimeout(() => router.push("/test-clerk-dashboard"), 600);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-6">Finish setting up your profile</h1>
        {apiError && <div className="mb-4 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-300 text-sm">{apiError}</div>}
        {ok && <div className="mb-4 p-3 rounded border border-green-500/30 bg-green-500/10 text-green-300 text-sm">Saved!</div>}
        <form className="space-y-4" onSubmit={submit}>
          <Row name="first_name" label="First name" value={form.first_name} onChange={onChange} />
          <Row name="last_name" label="Last name" value={form.last_name} onChange={onChange} />
          <Row name="phone" label="Phone" value={form.phone} onChange={onChange} />
          <Row name="occupation" label="Occupation" value={form.occupation} onChange={onChange} />
          <Row name="date_of_birth" label="Date of Birth (YYYY-MM-DD)" value={form.date_of_birth} onChange={onChange} />
          <div className="pt-2">
            <button disabled={saving} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ name, label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <input
        className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        name={name}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
