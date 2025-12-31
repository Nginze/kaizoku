import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getClient } from "./mongo";

export async function initAuth() {
  const client = await getClient();

  const auth = betterAuth({
    database: mongodbAdapter(client),
    trustedOrigins: [process.env.FRONTEND_URL as string],
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
  });

  return auth;
}
