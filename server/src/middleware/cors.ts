import type { CorsOptions } from "cors";

const cors: CorsOptions = {
  origin: process.env.FRONTEND_URL as string,
  credentials: true,
};

export { cors };
