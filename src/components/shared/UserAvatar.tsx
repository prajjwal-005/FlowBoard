'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/fetch";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function UserAvatar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  const handleLogout = async () => {
    try {
      await api.delete('/api/logout');
      queryClient.clear();
      router.push('/login');
    } catch {
      toast.error("Failed to log out");
    }
  };

  if (!user) return null; // or a skeleton circle

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {user.username.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-body font-medium leading-none">{user.nickname || user.username}</p>
            <p className="text-caption text-muted-foreground leading-none">
            {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-error focus:text-error cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}