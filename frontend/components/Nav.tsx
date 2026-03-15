"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/concepts", label: "Concepts" },
  { href: "/exercise", label: "Exercise Editor" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-8">
      <span className="font-bold text-lg text-indigo-400 tracking-tight">LearnFlow</span>
      <div className="flex gap-6">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors ${
              pathname.startsWith(link.href)
                ? "text-indigo-400"
                : "text-gray-400 hover:text-gray-100"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
