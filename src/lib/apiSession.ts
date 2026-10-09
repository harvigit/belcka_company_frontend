let signedIn = false;

export const setSignedIn = (value: boolean) => {
  signedIn = value;
};

export const hasSession = () => signedIn;

export async function storeApiToken(token: string | null | undefined) {
  if (!token) return;

  await fetch("/api/auth/api-token", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export async function clearStoredApiToken() {
  await fetch("/api/auth/api-token", {
    method: "DELETE",
    credentials: "include",
  });
}
