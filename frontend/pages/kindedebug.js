import Head from "next/head";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function getServerSideProps(ctx) {
  const { isAuthenticated, getUser } = await getKindeServerSession(ctx.req, ctx.res);
  const authed = await isAuthenticated();
  const user = authed ? await getUser() : null;

  return { props: { authed, user: user ? {
    id: user.id || null,
    email: user.email || null,
    given_name: user.given_name || null,
    family_name: user.family_name || null,
    picture: user.picture || null,
  } : null } };
}

export default function KindeDebug({ authed, user }) {
  return (
    <>
      <Head><title>Kinde Debug</title></Head>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl">
          <h1 className="text-2xl font-semibold mb-4">Kinde Debug</h1>
          {!authed ? (
            <p className="text-neutral-400">
              Not authenticated. Go to <a href="/kindelogin" className="underline">/kindelogin</a>.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <div><span className="text-neutral-400">id:</span> {user?.id}</div>
              <div><span className="text-neutral-400">email:</span> {user?.email}</div>
              <div><span className="text-neutral-400">given_name:</span> {user?.given_name}</div>
              <div><span className="text-neutral-400">family_name:</span> {user?.family_name}</div>
              {user?.picture && (
                <div className="mt-3">
                  <img src={user.picture} alt="avatar" className="h-12 w-12 rounded-full" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
