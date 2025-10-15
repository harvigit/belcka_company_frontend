"use client";
import { useEffect } from "react";
import { getFcmToken, onForegroundMessage } from "@/utils/firebase";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

export default function NotificationClient() {
  const { data: session } = useSession();
  const user = session?.user as User & { id: number };
  const userId = user?.id;
  const is_web = true;

useEffect(() => {
    if (!userId) return;

    let unsub: (() => void) | undefined;

    const init = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getFcmToken();
        if (!token) return;

        // send token to backend
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}notifications/save-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, token, is_web }),
          }
        );

        // listen for foreground messages
        unsub = onForegroundMessage((payload: any) => {
          const title = payload?.notification?.title || "Notification";
          const body = payload?.notification?.body || "";
          const icon = "/favicon.ico";

          if (Notification.permission === "granted") {
            new Notification(title, {
              body,
              icon,
            });
          }
        });
      } catch (err) {
        console.error("notif init error", err);
      }
    };

    init();

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [userId]);

  return null;
}
