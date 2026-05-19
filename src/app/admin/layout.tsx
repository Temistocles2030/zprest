"use client";

import dynamic from "next/dynamic";
import AdminNav from "@/components/admin/AdminNav";
import IdleGuard from "@/components/auth/IdleGuard";

const AdminGuard = dynamic(() => import("@/components/auth/AdminGuard"), {
  ssr: false,
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <IdleGuard />
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <AdminNav />
        <main className="flex-1 overflow-x-auto p-4 pt-16 md:p-6 md:pt-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
