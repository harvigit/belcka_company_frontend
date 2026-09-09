"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Cookies from "js-cookie";
import { useSession } from "next-auth/react";

export type ProjectDetailSharedFilters = {
  startDate: Date | null;
  endDate: Date | null;
  team_id: string | number;
  trade_id: string | number;
};

type ProjectDetailFiltersContextValue = {
  hydrated: boolean;
  startDate: Date | null;
  endDate: Date | null;
  teamId: string | number;
  tradeId: string | number;
  setDateRange: (from: Date | null, to: Date | null) => void;
  setTeamTrade: (teamId: string | number, tradeId: string | number) => void;
  applyFilters: (next: {
    team_id?: string | number;
    trade_id?: string | number;
    startDate?: Date | null;
    endDate?: Date | null;
  }) => void;
  clearSharedFilters: () => void;
};

const COOKIE_PREFIX = "project-detail-filters";
const COOKIE_OPTIONS = { expires: 365, path: "/" };

const ProjectDetailFiltersContext =
  createContext<ProjectDetailFiltersContextValue | null>(null);

const parseStoredDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isValidDate = (value: Date | null | undefined): value is Date =>
  Boolean(value && !Number.isNaN(value.getTime()));

type StoredPayload = {
  startDate?: string | null;
  endDate?: string | null;
  team_id?: string | number;
  trade_id?: string | number;
};

export function ProjectDetailFiltersProvider({
  projectId,
  children,
}: {
  projectId: number;
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const user = session?.user as { id?: number | string; company_id?: number | null };

  const cookieKey = useMemo(() => {
    if (!projectId || !user?.company_id) return null;
    return `${COOKIE_PREFIX}_${user.id ?? "user"}_${user.company_id}_${projectId}`;
  }, [projectId, user?.company_id, user?.id]);

  const [hydrated, setHydrated] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [teamId, setTeamId] = useState<string | number>("");
  const [tradeId, setTradeId] = useState<string | number>("");

  useEffect(() => {
    setHydrated(false);
    if (!cookieKey) {
      setStartDate(null);
      setEndDate(null);
      setTeamId("");
      setTradeId("");
      setHydrated(true);
      return;
    }

    try {
      const stored = Cookies.get(cookieKey);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredPayload;
        const parsedStart = parseStoredDate(parsed.startDate);
        const parsedEnd = parseStoredDate(parsed.endDate);
        // Only restore a complete range; partial/invalid dates mean "all records".
        if (isValidDate(parsedStart) && isValidDate(parsedEnd)) {
          setStartDate(parsedStart);
          setEndDate(parsedEnd);
        } else {
          setStartDate(null);
          setEndDate(null);
        }
        setTeamId(parsed.team_id ?? "");
        setTradeId(parsed.trade_id ?? "");
      } else {
        setStartDate(null);
        setEndDate(null);
        setTeamId("");
        setTradeId("");
      }
    } catch (error) {
      console.error("Failed to load project detail filters cookie:", error);
      Cookies.remove(cookieKey, { path: "/" });
      setStartDate(null);
      setEndDate(null);
      setTeamId("");
      setTradeId("");
    } finally {
      setHydrated(true);
    }
  }, [cookieKey]);

  useEffect(() => {
    if (!cookieKey || !hydrated) return;
    const hasCompleteRange = isValidDate(startDate) && isValidDate(endDate);
    const payload: StoredPayload = {
      startDate: hasCompleteRange ? startDate.toISOString() : null,
      endDate: hasCompleteRange ? endDate.toISOString() : null,
      team_id: teamId || "",
      trade_id: tradeId || "",
    };
    Cookies.set(cookieKey, JSON.stringify(payload), COOKIE_OPTIONS);
  }, [cookieKey, hydrated, startDate, endDate, teamId, tradeId]);

  const setDateRange = useCallback((from: Date | null, to: Date | null) => {
    if (isValidDate(from) && isValidDate(to)) {
      setStartDate(from);
      setEndDate(to);
      return;
    }
    setStartDate(null);
    setEndDate(null);
  }, []);

  const setTeamTrade = useCallback(
    (nextTeamId: string | number, nextTradeId: string | number) => {
      setTeamId(nextTeamId || "");
      setTradeId(nextTradeId || "");
    },
    [],
  );

  const applyFilters = useCallback(
    (next: {
      team_id?: string | number;
      trade_id?: string | number;
      startDate?: Date | null;
      endDate?: Date | null;
    }) => {
      if ("team_id" in next) setTeamId(next.team_id || "");
      if ("trade_id" in next) setTradeId(next.trade_id || "");
      if ("startDate" in next) setStartDate(next.startDate ?? null);
      if ("endDate" in next) setEndDate(next.endDate ?? null);
    },
    [],
  );

  const clearSharedFilters = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    setTeamId("");
    setTradeId("");
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      startDate,
      endDate,
      teamId,
      tradeId,
      setDateRange,
      setTeamTrade,
      applyFilters,
      clearSharedFilters,
    }),
    [
      hydrated,
      startDate,
      endDate,
      teamId,
      tradeId,
      setDateRange,
      setTeamTrade,
      applyFilters,
      clearSharedFilters,
    ],
  );

  return (
    <ProjectDetailFiltersContext.Provider value={value}>
      {children}
    </ProjectDetailFiltersContext.Provider>
  );
}

export function useProjectDetailFilters() {
  return useContext(ProjectDetailFiltersContext);
}
