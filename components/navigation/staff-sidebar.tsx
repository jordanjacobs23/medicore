"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardPlus,
  CreditCard,
  Building2,
  LayoutDashboard,
  Settings,
  Stethoscope,
  Users,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

export type StaffSidebarLink = {
  href: string;
  label: string;
  badgeCount?: number;
  children?: StaffSidebarLink[];
};

const icons = {
  "/calendar": CalendarDays,
  "/patients": Users,
  "/clinical": Stethoscope,
  "/billing": CreditCard,
  "/reports": BarChart3,
  "/practice/staff": Building2,
  "/practice/settings": Settings,
  "/patients/new": ClipboardPlus,
  "/messages": MessageSquare,
  "/break-glass": ShieldAlert,
};

function StaffSidebar({
  links,
  collapsed,
  onToggle,
}: {
  links: StaffSidebarLink[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(links.map((link) => [link.href, link.badgeCount ?? 0]))
  );
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      links
        .filter((link) => link.children?.length)
        .map((link) => [
          link.href,
          link.children?.some((child) =>
            pathname === child.href || pathname.startsWith(`${child.href}/`)
          ) ?? false,
        ])
    )
  );

  useEffect(() => {
    let active = true;

    fetch("/api/messages/unread-count", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { count?: number } | null) => {
        if (active && typeof data?.count === "number") {
          setBadgeCounts((counts) => ({ ...counts, "/messages": data.count ?? 0 }));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <aside className={`fixed bottom-0 left-0 top-0 z-40 hidden flex-col border-r border-slate-200 bg-white pt-[96px] transition-[width] duration-200 dark:border-[#273444] dark:bg-[#091827] md:flex ${collapsed ? "w-20" : "w-20 lg:w-[270px]"}`}>
      <div className={`hidden px-3 pb-2 lg:flex ${collapsed ? "justify-center" : "justify-end px-5"}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="staff-navigation"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white ${collapsed ? "justify-center px-2" : "justify-end"}`}
        >
          {collapsed ? <ChevronRight className="size-5" /> : <><ChevronLeft className="size-5" /></>}
        </button>
      </div>

      <nav id="staff-navigation" className={`min-h-0 flex-1 overflow-y-auto pt-1 ${collapsed ? "px-3" : "px-3 lg:px-5"}`} aria-label="Staff navigation">
        <div className="space-y-2">
          {links.map((link) => {
            const Icon = icons[link.href as keyof typeof icons] ?? LayoutDashboard;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const childActive = link.children?.some((child) =>
              pathname === child.href || pathname.startsWith(`${child.href}/`)
            ) ?? false;
            const menuOpen = openMenus[link.href] ?? active;

            return (
              <div key={link.href} className="overflow-hidden rounded-lg">
                {link.children?.length ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (collapsed) {
                          onToggle();
                          setOpenMenus((menus) => ({
                            ...menus,
                            [link.href]: true,
                          }));
                          return;
                        }

                        setOpenMenus((menus) => ({
                          ...menus,
                          [link.href]: !menuOpen,
                        }));
                      }}
                      aria-label={link.label}
                      aria-expanded={menuOpen}
                      title={link.label}
                      className={`relative flex min-h-12 w-full items-center gap-4 rounded-lg px-3 text-[17px] font-semibold transition-colors ${collapsed ? "justify-center lg:px-3" : "justify-center lg:justify-start lg:px-4"} ${
                        menuOpen || childActive
                          ? "bg-[#e6f4f8] text-[#247b99] dark:bg-[#315a6b] dark:text-white"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/7 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="size-5 shrink-0" strokeWidth={2} />
                      {!collapsed && <span className="hidden flex-1 text-left lg:inline">{link.label}</span>}
                      {!collapsed && (
                        menuOpen
                          ? <ChevronUp className="hidden size-4 shrink-0 lg:block" strokeWidth={2} />
                          : <ChevronDown className="hidden size-4 shrink-0 lg:block" strokeWidth={2} />
                      )}
                    </button>
                    {!collapsed && menuOpen && (
                      <div className="hidden pb-1 pt-1 lg:block">
                        {link.children.map((child) => {
                          const childIsActive =
                            pathname === child.href ||
                            pathname.startsWith(`${child.href}/`);

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              aria-current={childIsActive ? "page" : undefined}
                              className={`flex min-h-11 items-center gap-3 rounded-lg px-4 pl-11 text-[15px] font-medium transition-colors ${
                                childIsActive
                                  ? "bg-[#e6f4f8] text-[#247b99] dark:bg-[#315a6b] dark:text-white"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/7 dark:hover:text-white"
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setOpenMenus((menus) =>
                      Object.fromEntries(
                        Object.keys(menus).map((href) => [href, false])
                      )
                    )}
                    aria-label={link.label}
                    aria-current={active ? "page" : undefined}
                    title={link.label}
                    className={`relative flex min-h-12 items-center gap-4 rounded-lg px-3 text-[17px] font-semibold transition-colors ${collapsed ? "justify-center lg:justify-center lg:px-3" : "justify-center lg:justify-start lg:px-4"} ${
                      active
                        ? "bg-[#e6f4f8] text-[#247b99] shadow-sm dark:bg-[#315a6b] dark:text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/7 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="size-5 shrink-0" strokeWidth={2} />
                    {!collapsed && <span className="hidden lg:inline">{link.label}</span>}
                    {badgeCounts[link.href] > 0 ? (
                      <span className={`absolute right-1 top-0 flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#dc2626] text-[10px] font-bold leading-none text-white dark:border-[#091827] ${collapsed ? "lg:right-1 lg:top-0" : "lg:relative lg:right-auto lg:top-auto lg:ml-auto lg:size-6 lg:border-white lg:text-[11px]"}`}>
                        {badgeCounts[link.href] > 99 ? "99+" : badgeCounts[link.href]}
                      </span>
                    ) : null}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

export function StaffSidebarShell({
  links,
  children,
}: {
  links: StaffSidebarLink[];
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <StaffSidebar links={links} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <div className={`min-h-screen w-auto bg-[#edf2f6] transition-[margin-left] duration-200 md:ml-20 ${collapsed ? "lg:ml-20" : "lg:ml-[270px]"} dark:bg-[#111a22]`}>
        {children}
      </div>
    </>
  );
}
