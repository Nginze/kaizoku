import { api } from ".";
import { authClient } from "../auth-client";

export const auth = {
  signInGoogle: async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${import.meta.env.VITE_BASE_URL}/`,
      newUserCallbackURL: `${import.meta.env.VITE_BASE_URL}/`,
      errorCallbackURL: `${import.meta.env.VITE_BASE_URL}/error`,
    });
  },
  signOut: async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  },
  getMe: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },
};
