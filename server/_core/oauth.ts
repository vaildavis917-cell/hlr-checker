import type { Express, Request, Response } from "express";

// OAuth is disabled - using custom login/password authentication
// This file is kept for compatibility but redirects to login page

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    // OAuth is disabled, redirect to login page
    res.redirect(302, "/login");
  });
}
