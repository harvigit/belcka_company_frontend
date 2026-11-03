import { NextRequest, NextResponse } from "next/server";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

const getEnv = (keys: string[]): string | undefined => {
  return keys.map((key) => process.env[key]?.trim()).find((val) => Boolean(val));
};

const buildFirebaseClientConfig = (): FirebaseClientConfig | null => {
  const apiKey = getEnv(["FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY"]);
  const authDomain = getEnv([
    "FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  ]);
  const projectId = getEnv([
    "FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  ]);
  const storageBucket = getEnv([
    "FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  ]);
  const messagingSenderId = getEnv([
    "FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  ]);
  const appId = getEnv(["FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"]);

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }

  const config: FirebaseClientConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };

  const measurementId =
    process.env.FIREBASE_MEASUREMENT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (measurementId) {
    config.measurementId = measurementId;
  }

  return config;
};

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const config = buildFirebaseClientConfig();

    if (!config) {
      return NextResponse.json(
        {
          configured: false,
          message: "Firebase configuration is not configured in environment",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(config, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { configured: false, message: "Firebase configuration is not available" },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
