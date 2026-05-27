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

const getRequiredEnv = (keys: string[]): string => {
  const value = keys.map((key) => process.env[key]).find(Boolean);
  if (!value) {
    throw new Error(`Missing required env variable: one of ${keys.join(", ")}`);
  }
  return value;
};

const buildFirebaseClientConfig = (): FirebaseClientConfig => {
  const config: FirebaseClientConfig = {
    apiKey: getRequiredEnv(["FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY"]),
    authDomain: getRequiredEnv([
      "FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    ]),
    projectId: getRequiredEnv([
      "FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    ]),
    storageBucket: getRequiredEnv([
      "FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    ]),
    messagingSenderId: getRequiredEnv([
      "FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    ]),
    appId: getRequiredEnv(["FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"]),
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

    return NextResponse.json(config, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to build Firebase client config:", error);

    return NextResponse.json(
      { message: "Firebase configuration is not available" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
