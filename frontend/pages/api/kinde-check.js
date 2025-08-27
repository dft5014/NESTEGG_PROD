// pages/api/kinde-check.js
export default function handler(req, res) {
  // Return booleans / non-sensitive values ONLY
  const issuerUrlSet = !!process.env.KINDE_ISSUER_URL;
  const clientIdSet = !!process.env.KINDE_CLIENT_ID;
  const clientSecretSet = !!process.env.KINDE_CLIENT_SECRET; // may be false if your app doesn't use a secret
  const postLogin = process.env.KINDE_POST_LOGIN_REDIRECT_URL || null;
  const postLogout = process.env.KINDE_POST_LOGOUT_REDIRECT_URL || null;

  res.status(200).json({
    issuerUrlSet,
    clientIdSet,
    clientSecretSet,
    postLogin,
    postLogout,
  });
}
