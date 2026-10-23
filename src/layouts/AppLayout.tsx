import React from "react";
import { NavLink, Outlet } from "react-router";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "./navigation";
import { useUser, useRequiredUser } from "@/src/app/providers/UserProvider";
import { useActiveDrafts } from "@/src/hooks/useActiveDrafts";
import { cn, profileColor } from "@/src/lib/utils";

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-canvas">
      <Sidebar />
      <main className="lg:pl-72">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-[calc(env(safe-area-inset-top)+24px)] lg:pt-12 pb-36 lg:pb-16">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function useHasActiveWorkout() {
  return useActiveDrafts().length > 0;
}

function BottomNav() {
  const hasActive = useHasActiveWorkout();
  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-5 pb-[max(env(safe-area-inset-bottom),14px)] pointer-events-none"
      aria-label="Hoofdmenu"
    >
      <div className="pointer-events-auto mx-auto max-w-sm flex items-center gap-1 p-1.5 rounded-[26px] bg-surface/85 backdrop-blur-xl border border-line/70 shadow-float">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} className="relative flex-1">
            {({ isActive }) => (
              <span className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 h-14 rounded-[20px] text-[11px] font-semibold transition-colors",
                isActive ? "text-accent" : "text-muted"
              )}>
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-[20px] bg-accent-soft"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">
                  <item.icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                  {item.to === "/workout" && hasActive && (
                    <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-surface" />
                  )}
                </span>
                <span className="relative">{item.label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Sidebar() {
  const user = useRequiredUser();
  const { logout } = useUser();
  const hasActive = useHasActiveWorkout();
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 flex-col border-r border-line bg-surface/60 backdrop-blur-xl px-5 py-8">
      <div className="flex items-center gap-3 px-3">
        <img src="/brand/logo-light.png" alt="" className="h-9 w-auto" />
        <div>
          <p className="text-[15px] font-bold tracking-tight text-ink">SN Lift</p>
          <p className="text-xs text-muted">Train slimmer</p>
        </div>
      </div>

      <nav className="mt-10 space-y-1" aria-label="Hoofdmenu">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <span className={cn(
                "flex items-center gap-3 h-12 px-3 rounded-2xl text-[15px] font-semibold transition-colors",
                isActive ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-subtle"
              )}>
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                <span className="flex-1">{item.label}</span>
                {item.to === "/workout" && hasActive && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-success">Bezig</span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 p-3 rounded-2xl bg-surface border border-line shadow-soft">
        <Avatar name={user} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{user}</p>
          <p className="text-xs text-muted">Ingelogd</p>
        </div>
        <button
          onClick={logout}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-ink hover:bg-subtle transition-colors"
          aria-label="Wissel van gebruiker"
          title="Wissel van gebruiker"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <div className={cn(
      "rounded-full text-white font-bold flex items-center justify-center shrink-0",
      profileColor(name),
      size === "md" ? "w-10 h-10 text-sm" : "w-12 h-12 text-base"
    )}>
      {name.charAt(0)}
    </div>
  );
}
