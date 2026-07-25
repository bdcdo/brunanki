"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type {
  DiagnosticState,
  ReviewAttempt,
  SkillState
} from "@/types/learning";

export interface LearningSnapshot {
  diagnostic?: DiagnosticState;
  skills: SkillState[];
  attempts: ReviewAttempt[];
  loading: boolean;
}

interface AppContextValue extends LearningSnapshot {
  refresh(): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

async function loadSnapshot(): Promise<Omit<LearningSnapshot, "loading">> {
  try {
    const storage = await import("@/storage");
    const snapshot = await storage.readLearningSnapshot();
    return {
      skills: snapshot.skills,
      attempts: snapshot.attempts,
      ...(snapshot.diagnostic ? {diagnostic: snapshot.diagnostic} : {})
    };
  } catch {
    return {skills: [], attempts: []};
  }
}

export function AppProvider({children}: {children: React.ReactNode}) {
  const [snapshot, setSnapshot] = useState<LearningSnapshot>({
    skills: [],
    attempts: [],
    loading: true
  });

  const refresh = useCallback(async () => {
    const next = await loadSnapshot();
    setSnapshot({...next, loading: false});
  }, []);

  useEffect(() => {
    let active = true;
    void loadSnapshot().then((next) => {
      if (active) setSnapshot({...next, loading: false});
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({...snapshot, refresh}),
    [snapshot, refresh]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return value;
}
