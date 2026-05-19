"use client";

import { useAuth } from "@/hooks/useAuth";
import SessionAnomalyOverlay from "./SessionAnomalyOverlay";

export default function SessionWatcher({ children }: { children: React.ReactNode }) {
  const { sessionAnomaly } = useAuth();

  return (
    <>
      {sessionAnomaly && <SessionAnomalyOverlay />}
      {children}
    </>
  );
}
