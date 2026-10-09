import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import http from "http";
import https from "https";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

function readCookie(req: NextApiRequest, name: string) {
  const raw = req.headers.cookie || "";
  const match = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return null;
  }
}

function apiBase() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const skipAuth = req.headers["x-skip-auth"] === "true";
  const apiToken = skipAuth
    ? null
    : ((jwt as { accessToken?: string } | null)?.accessToken ||
      readCookie(req, "belcka_api_token"));

  const pathParts = req.query.path;
  const path = Array.isArray(pathParts) ? pathParts.join("/") : String(pathParts || "");
  const target = new URL(path, apiBase());
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path" || value == null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) target.searchParams.append(key, item);
  }

  const headers: http.OutgoingHttpHeaders = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers.cookie;
  delete headers["x-skip-auth"];

  if (apiToken) {
    headers.authorization = `Bearer ${apiToken}`;
    headers.is_web = "true";
  } else {
    delete headers.authorization;
  }

  const transport = target.protocol === "https:" ? https : http;
  const proxyReq = transport.request(
    target,
    { method: req.method, headers },
    (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders["transfer-encoding"];
      res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.status(502).json({
        IsSuccess: false,
        message: "Something went wrong. Please try again.",
      });
    }
  });

  req.pipe(proxyReq);
}
