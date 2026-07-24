import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getUserPermissions, Permission } from "@/lib/permissions";
import { User } from "next-auth";

export function usePermissions() {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const { data: session, status } = useSession();

    const user = session?.user as User & {
        company_id?: string | null;
        id: number;
    };

    useEffect(() => {
        const fetchPermissions = async () => {
            // Wait for NextAuth session hydration — do not clear loading early.
            if (status === "loading") {
                return;
            }

            if (status !== "authenticated" || !user?.id || !user?.company_id) {
                setPermissions([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const perms = await getUserPermissions(
                    Number(user.id),
                    Number(user.company_id)
                );
                setPermissions(perms);
            } catch (error) {
                console.error("Error fetching permissions:", error);
                setPermissions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, [user?.id, user?.company_id, status]);

    return { permissions, loading };
}
