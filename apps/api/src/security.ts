import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "@42bot/core";

export function applySecurityHeaders(_request: Request, response: Response, next: NextFunction): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cache-Control", "no-store");
  next();
}

export function requireApiAuth(config: AppConfig) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!config.API_AUTH_TOKEN) {
      next();
      return;
    }

    if (request.path === "/health") {
      next();
      return;
    }

    const header = request.header("authorization");
    const expected = `Bearer ${config.API_AUTH_TOKEN}`;
    if (header === expected) {
      next();
      return;
    }

    response.status(401).json({
      ok: false,
      error: "unauthorized",
      message: "API authorization token is required"
    });
  };
}
