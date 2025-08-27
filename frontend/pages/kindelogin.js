// pages/kindelogin.js
import Head from "next/head";
import Link from "next/link";

export default function KindeLoginPreview() {
  const loginHref   = "/api/auth/login?post_login_redirect_url=/kindelogin";
  const signupHref  = "/api/auth/register?post_login_redirect_url=/kindelogin";
  const logoutHref  = "/api/auth/logout?post_logout_redirect_url=/kindelogin";

  return (
    <>
      <Head><title>Kinde Login Preview</title></Head>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold">Kinde Login Preview</h1>
            <p className="text-sm text-neutral-400 mt-1">
              This page is isolated from your current auth—safe to click around.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href={loginHref}
              className="block w-full text-center rounded-xl border border-neutral-700 px-4 py-3 hover:bg-neutral-800 transition"
            >
              Continue with Kinde (Login)
            </Link>
            <Link
              href={signupHref}
              className="block w-full text-center rounded-xl border border-neutral-700 px-4 py-3 hover:bg-neutral-800 transition"
            >
              Continue with Kinde (Sign up)
            </Link>
            <Link
              href={logoutHref}
              className="block w-full text-center rounded-xl border border-neutral-800/60 bg-neutral-800/40 px-4 py-3 hover:bg-neutral-800 transition"
            >
              Logout (Kinde)
            </Link>
          </div>

          <div className="mt-6 text-xs text-neutral-500">
            Tip: tweak look & feel in Kinde’s dashboard and return here to see the hosted page changes.
          </div>
        </div>
      </div>
    </>
  );
}
