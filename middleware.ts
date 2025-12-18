import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const pathname = req.nextUrl.pathname;

        // Allow access to auth pages
        if (pathname.startsWith("/auth")) {
            return NextResponse.next();
        }

        // Allow access to public QR page
        if (pathname.startsWith("/apps/users/qr-code")) {
            return NextResponse.next();
        }

        // Check if user is authenticated
        if (!token) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: [
        "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
    ],
};
