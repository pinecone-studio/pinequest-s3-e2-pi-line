"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PineconeLogo from "@/app/_icons/PineconeLogo";
import { Bell, Search, X } from "lucide-react";
import { logout } from "@/lib/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types";

export default function Header({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0]?.toUpperCase() ?? "U";

  return (
    <header className="flex h-21.25 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <PineconeLogo className="h-5 w-5 text-slate-700" />
          <span className="text-sm font-semibold tracking-tight text-slate-800">
            ExamPanel
          </span>
        </div>

        <div className="relative hidden items-center md:flex">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#808084]" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="h-10 w-80 rounded-[10px] border-none bg-[#E5E5E5] pl-10 pr-10 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
              placeholder="Хайх"
            />
            {searchValue ? (
              <button
                type="button"
                className="absolute right-2.25 top-1/2 flex h-4.5 w-4.5 -translate-y-1/2 items-center justify-center rounded-full bg-[#808084]"
                onClick={() => setSearchValue("")}
                aria-label="Хайлтыг цэвэрлэх"
              >
                <X className="h-4.5 w-4.5 text-white" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm hover:bg-gray-50">
          <Bell className="h-5 w-5 text-gray-600" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-auto items-center gap-2 rounded-md px-2 py-1.5"
            >
              <Avatar>
                {profile.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name || profile.email}
                  />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {profile.full_name || "Хэрэглэгч"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">
                {profile.full_name || "Хэрэглэгч"}
              </p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={profile.role === "teacher" ? "/educator/profile" : "/admin"}
              >
                Профайл
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-destructive"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              Гарах
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
