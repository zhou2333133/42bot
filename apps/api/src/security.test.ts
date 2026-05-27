import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { loadConfig } from "@42bot/core";
import { requireApiAuth } from "./security.js";

describe("requireApiAuth", () => {
  it("allows requests when API_AUTH_TOKEN is unset", () => {
    const next = vi.fn();
    const response = fakeResponse();

    requireApiAuth(loadConfig({}))(
      fakeRequest({ path: "/snapshot" }),
      response,
      next
    );

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });

  it("allows health without token", () => {
    const next = vi.fn();
    const response = fakeResponse();

    requireApiAuth(loadConfig({ API_AUTH_TOKEN: "secret" }))(
      fakeRequest({ path: "/health" }),
      response,
      next
    );

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });

  it("blocks protected requests without bearer token", () => {
    const next = vi.fn();
    const response = fakeResponse();

    requireApiAuth(loadConfig({ API_AUTH_TOKEN: "secret" }))(
      fakeRequest({ path: "/execution/plan" }),
      response,
      next
    );

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it("allows protected requests with bearer token", () => {
    const next = vi.fn();
    const response = fakeResponse();

    requireApiAuth(loadConfig({ API_AUTH_TOKEN: "secret" }))(
      fakeRequest({ path: "/execution/plan", authorization: "Bearer secret" }),
      response,
      next
    );

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });
});

function fakeRequest(options: { path: string; authorization?: string }): Request {
  return {
    path: options.path,
    header: (name: string) => (name.toLowerCase() === "authorization" ? options.authorization : undefined)
  } as Request;
}

function fakeResponse(): Response {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  return response as unknown as Response;
}
