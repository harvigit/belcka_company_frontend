import type { NextApiRequest, NextApiResponse } from "next";

const COOKIE = "belcka_api_token";

function cookieFlags() {
  const secure = process.env.NEXTAUTH_URL?.startsWith("https://") ? "; Secure" : "";
  return `HttpOnly; Path=/; SameSite=Lax${secure}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    if (!token) {
      res.status(400).json({ ok: false });
      return;
    }

    res.setHeader(
      "Set-Cookie",
      `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${60 * 60 * 24 * 30}; ${cookieFlags()}`,
    );
    res.status(204).end();
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; ${cookieFlags()}`);
    res.status(204).end();
    return;
  }

  res.setHeader("Allow", "POST, DELETE");
  res.status(405).end();
}
