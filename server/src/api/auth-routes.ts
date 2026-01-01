import { Router } from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { initAuth } from "../config/auth";

export const router = Router();

initAuth().then((auth) => {
  router.get("/me", async (req, res) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    res.json(session?.user || null);
  });

  router.all("/*", toNodeHandler(auth));
});
