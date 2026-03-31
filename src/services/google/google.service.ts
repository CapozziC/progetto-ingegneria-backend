import { OAuth2Client } from "google-auth-library";
import { GoogleAccountData } from "../../types/google.type.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const verifyGoogleToken = async (
  idtoken: string,
): Promise<GoogleAccountData> => {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    throw new Error("GOOGLE_CLIENT_ID not configured");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: idtoken,
    audience,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub) {
    throw new Error("Invalid Google token payload");
  }

  const firstName =
    payload.given_name?.trim() ||
    payload.name?.trim().split(" ")[0] ||
    "Account";

  const lastName =
    payload.family_name?.trim() ||
    payload.name?.trim().split(" ").slice(1).join(" ") ||
    "";

  return {
    providerAccountId: payload.sub,
    email: payload.email?.toLowerCase(),
    firstName,
    lastName,
  };
};
