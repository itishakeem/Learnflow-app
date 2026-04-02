"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, X, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

type NavLink = { href: string; label: string; exact?: boolean };

const MARKETING_LINKS: NavLink[] = [
  { href: "/",        label: "Home",    exact: true },
  { href: "/about",   label: "About" },
  { href: "/contact", label: "Contact" },
];

const APP_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/concepts",  label: "Concepts" },
  { href: "/exercise",  label: "Exercise Editor" },
];

function isActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export default function Nav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);
  const { user, isGuest, logout } = useAuth();

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isAppPage  = APP_LINKS.some((l) => pathname.startsWith(l.href));
  const links      = isAppPage ? APP_LINKS : MARKETING_LINKS;

  if (isAuthPage) return null;

  function handleLogout() {
    logout();
    setOpen(false);
    router.push("/");
  }

  // User's initials for avatar
  const initials = user
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : null;

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.0, 0.0, 0.2, 1] }}
        className="sticky top-0 z-50 h-16 bg-surface/85 backdrop-blur-xl shadow-nav
                   flex items-center px-4 sm:px-6 gap-6"
      >
        {/* ── Brand ─────────────────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group"
          onClick={() => setOpen(false)}
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center
                           text-white text-xs font-bold shadow-glow-sm group-hover:shadow-glow-brand
                           transition-shadow duration-300">
            LF
          </span>
          <span className="font-bold text-base text-gradient tracking-tight">LearnFlow</span>
        </Link>

        {/* ── Desktop nav links ──────────────────────────────── */}
        <div className="hidden sm:flex items-center gap-0.5">
          {links.map((link) => {
            const active = isActive(pathname, link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150",
                  active
                    ? "text-ink-primary"
                    : "text-ink-tertiary hover:text-ink-secondary hover:bg-surface-raised",
                ].join(" ")}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-surface-raised rounded-lg border border-surface-border"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* ── Right side ─────────────────────────────────────── */}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            /* ── Authenticated ─ */
            <div className="hidden sm:flex items-center gap-2">
              {/* Avatar */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised
                              border border-surface-border text-xs font-medium text-ink-secondary">
                <span className="w-5 h-5 rounded-md bg-gradient-brand flex items-center justify-center
                                 text-white text-2xs font-bold shrink-0">
                  {initials}
                </span>
                <span className="max-w-[120px] truncate">{user.name}</span>
              </div>
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-ink-disabled hover:text-danger-light
                           hover:bg-danger/10 transition-all duration-150"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : isGuest && !isAppPage ? (
            /* ── Guest on marketing pages ─ */
            <>
              <Link
                href="/login"
                className="hidden sm:block px-3.5 py-1.5 rounded-lg text-sm font-medium
                           text-ink-tertiary hover:text-ink-secondary hover:bg-surface-raised
                           transition-all duration-150"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                           bg-brand hover:bg-brand-400 text-white
                           shadow-glow-sm hover:shadow-glow-brand
                           transition-all duration-200 group"
              >
                Sign up
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          ) : isGuest && isAppPage ? (
            /* ── Guest on app pages — show sign-up nudge ─ */
            <>
              <Link
                href="/signup"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold
                           bg-brand/10 hover:bg-brand/20 border border-brand/25 text-brand-300
                           transition-all duration-200"
              >
                Sign up free
              </Link>
              <Link
                href="/"
                className="text-xs text-ink-disabled hover:text-ink-secondary transition-colors px-3 py-1.5"
              >
                ← Site
              </Link>
            </>
          ) : (
            /* ── Auth user on app pages — just back link ─ */
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/"
                className="text-xs text-ink-disabled hover:text-ink-secondary transition-colors px-3 py-1.5"
              >
                ← Site
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised
                              border border-surface-border text-xs font-medium text-ink-secondary">
                <span className="w-5 h-5 rounded-md bg-gradient-brand flex items-center justify-center
                                 text-white text-2xs font-bold shrink-0">
                  {initials ?? <User size={10} />}
                </span>
                <span className="max-w-[100px] truncate">{(user as { name: string } | null)?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-ink-disabled hover:text-danger-light
                           hover:bg-danger/10 transition-all duration-150"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="sm:hidden ml-1 p-2 rounded-lg text-ink-tertiary hover:text-ink-primary
                       hover:bg-surface-raised transition-colors duration-150"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </motion.nav>

      {/* ── Mobile drawer ────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl
                       border-b border-surface-border px-4 py-4 flex flex-col gap-1 sm:hidden"
          >
            {links.map((link) => {
              const active = isActive(pathname, link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-surface-raised text-ink-primary border border-surface-border"
                      : "text-ink-secondary hover:bg-surface-raised hover:text-ink-primary",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile auth actions */}
            {user ? (
              <>
                <div className="px-4 py-2 text-xs text-ink-disabled border-t border-surface-border mt-1 pt-3">
                  Signed in as <span className="text-ink-secondary font-medium">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                             text-danger-light hover:bg-danger/10 transition-colors duration-150"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-ink-secondary
                             hover:bg-surface-raised hover:text-ink-primary transition-colors duration-150"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 mx-1 px-4 py-3 rounded-xl
                             text-sm font-semibold bg-brand text-white transition-colors duration-150"
                >
                  Sign up free <ArrowRight size={13} />
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
