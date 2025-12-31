import axios from "axios";
import { anime } from "./anime";
import { auth } from "./auth";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
});

export const client = {
  ...anime,
  ...auth,
};
