// pages/test-clerk-onboarding.js
import {  useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function TestClerkOnboarding() {
  return (

      <OnboardContent />
  );
}

function OnboardContent() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken, isSignedIn } = useAuth();

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

  // ---------- helpers ----------
  const base = process.env.NEXT_PUBLIC_API_URL;
  function assertBase() {
    if (!base) throw new Error("[CFG] NEXT_PUBLIC_API_URL is not set");
  }
  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  useEffect(() => {
    if (!isLoaded || !user) return;
    console.groupCollapsed("[Onboarding] init user defaults");
    try {
      console.debug("[Onboarding] user.id", user.id);
      console.debug("[Onboarding] user.email", user.primaryEmailAddress?.emailAddress);
      console.debug("[Onboarding] user.publicMetadata", user.publicMetadata);
      console.debug("[Onboarding] user.unsafeMetadata", user.unsafeMetadata);

      setForm({
        first_name: user.firstName || "",
        last_name: user.lastName || "",
        phone: user.unsafeMetadata?.phone || "",
        occupation: user.unsafeMetadata?.occupation || "",
        date_of_birth: user.unsafeMetadata?.date_of_birth || "",
      });
    } finally {
      console.groupEnd();
    }
  }, [isLoaded, user]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setApiError("");

    // GROUP: FULL FLOW
    console.groupCollapsed("[Onboarding] flow");
    try {
      if (!isLoaded || !isSignedIn || !user) {
        throw new Error("[State] Clerk not loaded or user not signed in");
      }
      assertBase();

      // 1) Update Clerk metadata
      console.groupCollapsed("[Onboarding] 1. update Clerk metadata");
      try {
        const payload = {
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
        };
        console.debug("[Onboarding] user.update payload", payload);
        await user.update(payload);
        console.debug("[Onboarding] user.update done");
      } catch (err) {
        console.error("[Onboarding] user.update error", err);
        throw err;
      } finally {
        console.groupEnd();
      }

      // 2) Get Clerk session token (optionally use a template)
      console.groupCollapsed("[Onboarding] 2. get Clerk token");
      let cJwt = null;
      try {
        cJwt = await getToken(/* { template: "nestegg" } */);
        console.debug("[Onboarding] getToken -> hasToken", !!cJwt, "len", cJwt?.length);
        if (!cJwt) throw new Error("[Auth] getToken() returned empty");
      } catch (err) {
        console.error("[Onboarding] getToken error", err);
        throw err;
      } finally {
        console.groupEnd();
      }

      // 3) Exchange Clerk token for app token (creates/links Supabase user)
      console.groupCollapsed("[Onboarding] 3. POST /auth/exchange");
      let appToken = null;
      let exchangeRespText = "";
      try {
        const url = `${base}/auth/exchange`;
        console.debug("[Onboarding] POST", url);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerk_jwt: cJwt }),
        });
        exchangeRespText = await res.text();
        console.debug("[Onboarding] exchange.status", res.status);
        console.debug("[Onboarding] exchange.body", truncate(exchangeRespText, 400));
        if (!res.ok) throw new Error(`[Exchange] ${res.status} ${exchangeRespText}`);
        const data = JSON.parse(exchangeRespText);
        appToken = data.access_token;
        localStorage.setItem("token", appToken);
        console.debug("[Onboarding] appToken stored", !!appToken);
      } catch (err) {
        console.error("[Onboarding] exchange error", err);
        throw err;
      } finally {
        console.groupEnd();
      }

      // 4) Save onboarding profile to backend
      console.groupCollapsed("[Onboarding] 4. POST /me/onboard");
      try {
        const url = `${base}/me/onboard`;
        console.debug("[Onboarding] POST", url);
        console.debug("[Onboarding] form", form);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(form),
        });
        const body = await res.text();
        console.debug("[Onboarding] onboard.status", res.status);
        console.debug("[Onboarding] onboard.body", body);
        if (!res.ok) throw new Error(`[Onboard] ${res.status} ${body}`);
      } catch (err) {
        console.error("[Onboarding] onboard error", err);
        throw err;
      } finally {
        console.groupEnd();
      }

      setOk(true);
      console.info("[Onboarding] ✓ success; redirecting to /test-clerk-dashboard");
      setTimeout(() => router.push("/test-clerk-dashboard"), 800);
    } catch (e) {
      console.error("[Onboarding] ✗ failed", e);
      setApiError(e.message || String(e));
    } finally {
      console.groupEnd();
      setSaving(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-6">Finish setting up your profile</h1>

      {apiError && (
        <div className="mb-4 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {apiError}
        </div>
      )}
      {ok && (
        <div className="mb-4 p-3 rounded border border-green-500/30 bg-green-500/10 text-green-300 text-sm">
          Saved!
        </div>
      )}

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

        <div className="mt-8 text-xs text-gray-500 space-y-1">
          <div><b>API Base</b>: {base || "(not set)"}</div>
          <div><b>User ID</b>: {user?.id || "—"}</div>
          <div><b>Email</b>: {user?.primaryEmailAddress?.emailAddress || "—"}</div>
        </div>
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

function truncate(s, n) {
  if (typeof s !== "string") return s;
  return s.length > n ? s.slice(0, n) + "…" : s;
}
