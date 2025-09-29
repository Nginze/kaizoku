import axios from "axios";
import { anime } from "./anime";

export const api = axios.create({
  baseURL: "http://localhost:8080/api",
});

export const client = {
  ...anime,
};
