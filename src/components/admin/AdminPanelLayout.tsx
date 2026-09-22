"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminWorkStats } from "@/hooks/useAdminWorkStats";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/onboarding", label: "Onboarding" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/content", label: "Content review" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/payments", label: "Payments" },
];

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const _copy = useUiCopy();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { isAdmin, isSuperAdmin, checked, reason } = useAdminAccess();
  const { pendingTotal } = useAdminWorkStats(isAdmin);

  if (loading || !checked) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center text-white">
        <p className="text-xiio-muted"><UiText text={"Loading admin console…"} /></p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-white text-lg"><UiText text={"Sign in to access the admin console."} /></p>
        <Link
          href="/login"
          className="px-6 py-3 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover text-white font-medium transition"
        ><UiText text={"Sign in"} /></Link>
        <Link href="/" className="text-sm text-xiio-muted hover:text-white transition"><UiText text={"Back to home"} /></Link>
      </div>
    );
  }

  if (reason === "admin_sdk_missing") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-4 px-4 max-w-lg mx-auto text-center">
        <p className="text-amber-400 font-medium"><UiText text={"Admin services are not configured."} /></p>
        <p className="text-xiio-muted text-sm"><UiText text={"Configure the Firebase Admin SDK before opening this console."} /></p>
        <Link href="/" className="text-sm text-xiio-accent hover:underline"><UiText text={"Home"} /></Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-400"><UiText text={"You do not have permission to access this page."} /></p>
        <Link href="/" className="text-sm text-xiio-muted hover:text-white transition"><UiText text={"Back to home"} /></Link>
      </div>
    );
  }

  return (
    <section className="min-h-[calc(100vh-64px)] bg-xiio-bg text-white">
      <header className="border-b border-white/[0.08] px-5 pt-7 sm:px-8 sm:pt-9">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-xiio-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-xiio-accent" aria-hidden /><UiText text={"Admin workspace"} /></p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl"><UiText text={"Platform operations"} /></h1>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/55">
              {isSuperAdmin ? _copy("Super admin") : _copy("Admin")}
            </span>
          </div>

          <nav className="flex gap-7 overflow-x-auto" aria-label={_copy("Admin sections")}>
            {ADMIN_NAV.map(({ href, label, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  className={`relative flex shrink-0 items-center gap-2 pb-3 text-sm font-medium whitespace-nowrap transition ${
                    active ? "text-white" : "text-white/40 hover:text-white/75"
                  }`}
                >
                  <span>{_copy(label)}</span>
                  {href === "/admin/content" && pendingTotal > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-black">
                      {pendingTotal > 99 ? "99+" : pendingTotal}
                    </span>
                  )}
                  {active ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-xiio-accent" aria-hidden />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="min-w-0 px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </section>
  );
}
