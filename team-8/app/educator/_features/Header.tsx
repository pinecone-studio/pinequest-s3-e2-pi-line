"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PineconeLogo from "@/app/_icons/PineconeLogo";
import { Bell } from "lucide-react";
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
  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0]?.toUpperCase() ?? "U";

  return (
    <header className="w-full h-13 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
      {/* LEFT: Title */}
      <div className="flex items-center gap-1">
        <PineconeLogo className="h-5 w-5 text-black" />
        <span className="text-l font-bold text-gray-900 tracking-tight">
          ExamPanel
        </span>
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-4">
        {/* Notification */}
        <button className="relative p-2 rounded-md hover:border-black">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 text-xs bg-black text-white rounded-full px-1">
            3
          </span>
        </button>

    
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-auto items-center gap-2 rounded-md px-2 py-1.5">
              <Avatar>
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name || profile.email} />
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
              <p className="text-sm font-medium">{profile.full_name || "Хэрэглэгч"}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={profile.role === "teacher" ? "/educator/profile" : "/admin"}>
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
