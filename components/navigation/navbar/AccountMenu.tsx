"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu() {
  const clerk = useClerk();
  const { user } = useUser();
  const { setTheme } = useTheme();
  const accountName = user?.username
    ? `@${user.username}`
    : user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? "your account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 shadow-sm transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#397f99] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        <UserRound className="size-5" strokeWidth={1.7} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-48 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="max-w-full truncate px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Logged in as {accountName}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          onClick={() => clerk.openUserProfile()}
          className="cursor-pointer px-3 py-2"
        >
          <UserRound className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer px-3 py-2">
            <Monitor className="size-4" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-36 rounded-xl border border-slate-200 bg-white p-1 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
              <Sun className="size-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
              <Moon className="size-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
              <Monitor className="size-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          onClick={() => void clerk.signOut()}
          className="cursor-pointer px-3 py-2"
        >
          <LogOut className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
