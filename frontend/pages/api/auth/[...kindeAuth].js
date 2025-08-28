import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";

export default handleAuth({
  onSuccessRedirect: async (user, request) => {
    console.log("Kinde auth successful for user:", user?.email);
    return '/kinde-debug';
  },
  onErrorRedirect: async (error, request) => {
    console.error("Kinde auth error:", error);
    return '/kindelogin?error=auth_failed';
  }
});