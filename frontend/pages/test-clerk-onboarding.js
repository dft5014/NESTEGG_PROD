// pages/test-clerk-onboarding.js
import { ClerkProvider, useUser, useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/router";
import { AlertCircle, CheckCircle } from 'lucide-react';

function OnboardContent() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  const [form, setForm] = useState({
    first_name: user?.firstName || "",
    last_name: user?.lastName || "",
    phone: user?.unsafeMetadata?.phone || "",
    occupation: user?.unsafeMetadata?.occupation || "",
    date_of_birth: user?.unsafeMetadata?.date_of_birth || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  const validateForm = () => {
    const newErrors = {};
    if (!form.first_name.trim()) newErrors.first_name = "First name is required";
    if (!form.last_name.trim()) newErrors.last_name = "Last name is required";
    if (form.phone && !/^\+?\d{10,15}$/.test(form.phone)) newErrors.phone = "Invalid phone number";
    if (form.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(form.date_of_birth)) newErrors.date_of_birth = "Invalid date format";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setApiError("");
    setErrors({});

    if (!validateForm()) {
      setSaving(false);
      return;
    }

    try {
      console.log('Updating Clerk metadata with:', form);
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          phone: form.phone || undefined,
          occupation: form.occupation || undefined,
          date_of_birth: form.date_of_birth || undefined,
          plan: user?.unsafeMetadata?.plan || 'free',
          onboardedAt: new Date().toISOString(),
        },
      });
      console.log('Clerk metadata update successful');

      const clerkJwt = await getToken();
      const api = process.env.NEXT_PUBLIC_API_URL; // Updated to match your env var
      console.log('Environment variable NEXT_PUBLIC_API_URL:', api);
      console.log('Starting token exchange to:', api ? `${api}/auth/exchange` : 'undefined', 'with method: POST', 'body:', { clerk_jwt: clerkJwt.substring(0, 20) + '...' });
      if (!api) {
        throw new Error(`API base URL is not available. Current value: "${api}". Please ensure NEXT_PUBLIC_API_URL is correctly set in Vercel environment variables (e.g., https://nestegg-api.onrender.com/).`);
      }
      const ex = await fetch(`${api}/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_jwt: clerkJwt }),
      });
      console.log('Token exchange response status:', ex.status, 'ok:', ex.ok);
      if (!ex.ok) {
        const j = await ex.text();
        console.error('Token exchange failed response:', j);
        throw new Error(`Token exchange failed (${ex.status}): ${j || 'No response body'}`);
      }
      const data = await ex.json();
      localStorage.setItem("token", data.access_token);
      console.log('Token exchange successful, NestEgg token stored');

      console.log('Starting profile save to:', `${api}/me/onboard`, 'with body:', form);
      const save = await fetch(`${api}/me/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.access_token}`,
        },
        body: JSON.stringify(form),
      });
      console.log('Profile save response status:', save.status, 'ok:', save.ok);
      if (!save.ok) {
        const j = await save.text();
        console.error('Profile save failed response:', j);
        throw new Error(`Profile save failed (${save.status}): ${j || 'No response body'}`);
      }
      console.log('Profile save successful');

      router.push("/test-clerk-dashboard");
    } catch (e) {
      console.error('Onboarding error:', e);
      setApiError(e.message || "An error occurred. Please check console for details.");
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <div className="text-gray-100">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h1 className="text-gray-100 text-xl font-semibold">Quick Onboarding</h1>
        <p className="text-gray-400 text-sm">Add details to personalize your NestEgg experience.</p>
        {user?.unsafeMetadata?.plan && (
          <p className="text-gray-400 text-sm">Signed up for {user.unsafeMetadata.plan} plan.</p>
        )}

        {apiError && (
          <div className="text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {apiError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">First name *</label>
            <input 
              name="first_name" 
              value={form.first_name} 
              onChange={onChange} 
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:ring-blue-500/20 transition-transform duration-200 focus:scale-105" 
              required
            />
            {errors.first_name && <p className="text-red-400 text-xs mt-1">{errors.first_name}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Last name *</label>
            <input 
              name="last_name" 
              value={form.last_name} 
              onChange={onChange} 
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:ring-blue-500/20 transition-transform duration-200 focus:scale-105" 
              required
            />
            {errors.last_name && <p className="text-red-400 text-xs mt-1">{errors.last_name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone</label>
            <input 
              name="phone" 
              value={form.phone} 
              onChange={onChange} 
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:ring-blue-500/20 transition-transform duration-200 focus:scale-105" 
              placeholder="+1234567890"
            />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Occupation</label>
            <input 
              name="occupation" 
              value={form.occupation} 
              onChange={onChange} 
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:ring-blue-500/20 transition-transform duration-200 focus:scale-105" 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Date of birth</label>
          <input 
            type="date" 
            name="date_of_birth" 
            value={form.date_of_birth} 
            onChange={onChange} 
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:ring-blue-500/20 transition-transform duration-200 focus:scale-105" 
          />
          {errors.date_of_birth && <p className="text-red-400 text-xs mt-1">{errors.date_of_birth}</p>}
        </div>

        <button 
          disabled={saving} 
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 text-gray-100 disabled:opacity-60 transition-transform duration-200 hover:scale-105"
        >
          {saving ? "Saving..." : "Save & Continue"}
        </button>
      </form>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: ['dark', 'minimal'],
        variables: {
          colorPrimary: '#6366f1',
          colorBackground: '#0f0f0f',
          colorText: '#f3f4f6',
          colorInputBackground: '#111827',
          colorInputText: '#f3f4f6',
          borderRadius: '0.5rem',
          fontFamily: 'Inter, sans-serif'
        }
      }}
    >
      <OnboardContent />
    </ClerkProvider>
  );
}

// SSR passthrough with env var log
export async function getServerSideProps() {
  console.log('Server-side NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  return { props: {} };
}