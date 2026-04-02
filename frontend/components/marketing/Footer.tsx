import Link from "next/link";
import { SocialLinks } from "./SocialLinks";

const PAGES = [
  { label: "Home",     href: "/" },
  { label: "About",    href: "/about" },
  { label: "Contact",  href: "/contact" },
];

const APP = [
  { label: "Dashboard",       href: "/dashboard" },
  { label: "Concepts",        href: "/concepts" },
  { label: "Exercise Editor", href: "/exercise" },
];

const AUTH = [
  { label: "Log in",  href: "/login" },
  { label: "Sign up", href: "/signup" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="section-divider bg-surface-base/40 px-4 sm:px-6 pt-14 pb-8">
      <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
        {/* Brand */}
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-4 w-fit group">
            <span className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center
                             text-white text-xs font-bold shadow-glow-sm">
              LF
            </span>
            <span className="font-bold text-sm text-gradient">LearnFlow</span>
          </Link>
          <p className="text-sm text-ink-disabled leading-relaxed mb-5 max-w-[200px]">
            AI-powered Python learning platform. Practice smarter, grow faster.
          </p>
          <SocialLinks />
        </div>

        {/* Pages */}
        <FooterCol title="Pages" links={PAGES} />
        <FooterCol title="App"   links={APP}   />
        <FooterCol title="Auth"  links={AUTH}  />
      </div>

      {/* Bottom bar */}
      <div className="max-w-5xl mx-auto pt-6 border-t border-surface-border
                      flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="text-2xs text-ink-disabled">© {year} LearnFlow. All rights reserved.</p>
        <p className="text-2xs text-ink-disabled">Next.js · Tailwind CSS · Framer Motion</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="section-label text-ink-disabled mb-4">{title}</p>
      <ul className="space-y-3">
        {links.map(({ label, href }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-sm text-ink-tertiary hover:text-ink-primary transition-colors duration-150"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
