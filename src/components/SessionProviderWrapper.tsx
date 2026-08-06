
"use client";

import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

const SESSION_ENDPOINT = "/api/auth/session";
const SESSION_REFRESH_THROTTLE_MS = 5 * 60 * 1000;

function SessionActivityRefresher() {
    const router = useRouter();
    const lastRefreshAtRef = useRef(0);
    const refreshInFlightRef = useRef(false);
    const redirectingRef = useRef(false);

    const refreshSession = useCallback(async () => {
        if (redirectingRef.current || refreshInFlightRef.current) {
            return;
        }

        if (document.visibilityState === "hidden") {
            return;
        }

        const now = Date.now();
        if (now - lastRefreshAtRef.current < SESSION_REFRESH_THROTTLE_MS) {
            return;
        }

        refreshInFlightRef.current = true;

        try {
            const response = await fetch(SESSION_ENDPOINT, {
                cache: "no-store",
                credentials: "same-origin",
            });

            if (!response.ok) {
                return;
            }

            const session = await response.json();
            lastRefreshAtRef.current = Date.now();

            if (!session?.user) {
                redirectingRef.current = true;
                router.replace("/login?reauth=1");
                router.refresh();
            }
        } catch {
            // A transient network failure should not sign the user out by itself.
        } finally {
            refreshInFlightRef.current = false;
        }
    }, [router]);

    useEffect(() => {
        const handleActivity = () => {
            void refreshSession();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void refreshSession();
            }
        };

        window.addEventListener("pointerdown", handleActivity);
        window.addEventListener("keydown", handleActivity);
        window.addEventListener("touchstart", handleActivity);
        window.addEventListener("focus", handleActivity);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("pointerdown", handleActivity);
            window.removeEventListener("keydown", handleActivity);
            window.removeEventListener("touchstart", handleActivity);
            window.removeEventListener("focus", handleActivity);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [refreshSession]);

    return null;
}

export default function SessionProviderWrapper({
    children,
    session,
}: {
    children: React.ReactNode;
    session: any;
}) {
    return (
        <SessionProvider session={session}>
            <SessionActivityRefresher />
            {children}
        </SessionProvider>
    );
}
