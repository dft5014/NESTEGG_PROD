// frontend/pages/api/kinde-check.js
export default function handler(req, res) {
  // Only check the variables we actually need
  const issuerUrlSet = !!process.env.KINDE_ISSUER_URL;
  const clientIdSet = !!process.env.KINDE_CLIENT_ID;
  const postLogin = process.env.KINDE_POST_LOGIN_REDIRECT_URL || null;
  const postLogout = process.env.KINDE_POST_LOGOUT_REDIRECT_URL || null;

  res.status(200).json({
    issuerUrlSet,
    clientIdSet,
    postLogin,
    postLogout,
    // Show what we have for debugging
    issuerUrl: process.env.KINDE_ISSUER_URL,
    clientIdPreview: process.env.KINDE_CLIENT_ID ? `${process.env.KINDE_CLIENT_ID.slice(0, 8)}...` : null,
  });
}