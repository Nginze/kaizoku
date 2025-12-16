import { useMutation } from "@tanstack/react-query";

// Replace this with your actual Google Apps Script Web App URL
const GOOGLE_SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL || "";

interface SubmitRequestData {
  reason: string;
  animeId?: string;
  episodeNumber?: number;
  description: string;
}

const submitRequest = async (data: SubmitRequestData) => {
  const payload = {
    reason: data.reason,
    animeId: data.animeId || "",
    episodeNumber: data.episodeNumber || "",
    description: data.description,
    timestamp: new Date().toISOString(),
  };

  const response = await fetch(GOOGLE_SHEETS_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Note: no-cors mode doesn't allow reading the response
  // We assume success if no error is thrown
  return { success: true };
};

export const useSubmitRequest = () => {
  return useMutation({
    mutationFn: submitRequest,
  });
};
