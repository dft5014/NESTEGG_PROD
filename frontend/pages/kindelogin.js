import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs";

export default function KindeLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl mb-6">Sign in with Kinde</h1>
      <div className="space-x-4">
        <LoginLink postLoginRedirectURL="/portfolio">
          <button className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700">Log In</button>
        </LoginLink>
        <RegisterLink postLoginRedirectURL="/portfolio">
          <button className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-700">Register</button>
        </RegisterLink>
      </div>
    </div>
  );
}
