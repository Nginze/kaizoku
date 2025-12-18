import axios from "axios";
import { anime } from "./anime";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

export const client = {
  ...anime,
};
