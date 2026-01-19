import { getMeOptions } from "@/features/authentication/queries/get-me";
import { useQuery } from "@tanstack/react-query";

export const useAnalytics = () => {
  const { data: userData } = useQuery(getMeOptions());

  return {
    trackLogin: () => {
      if (!userData) return;

      window.rybbit.identify(userData.id, {
        name: userData.name,
        email: userData.email,
        image: userData.image,
      });

      window.rybbit.event("User Login", {
        method: "google",
      });
    },
  };
};
