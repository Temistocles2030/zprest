"use client";

import dynamic from "next/dynamic";
import PortalNav from "@/components/portal/PortalNav";
import ZiroChat from "@/components/landing/ZiroChat";
import IdleGuard from "@/components/auth/IdleGuard";

const AuthGuard = dynamic(() => import("@/components/auth/AuthGuard"), {
  ssr: false,
});

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <IdleGuard />
      <div className="min-h-screen bg-bg-primary dark:bg-gray-950">
        <PortalNav />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <ZiroChat mode="asesor" />
      </div>
    </AuthGuard>
  );
}
