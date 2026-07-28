'use client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Users } from 'lucide-react'
import { usePresence } from '@/hooks/realtime/usePresence'

export function PresenceStack({ boardId }: { boardId: string }) {
  const onlineUsers = usePresence(boardId)
  if (onlineUsers.length === 0) return null

  const visible = onlineUsers.slice(0, 4)
  const overflow = onlineUsers.length - visible.length
  const shouldOverlap = onlineUsers.length > 4

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1 text-caption font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {onlineUsers.length} Online
        </span>

        <div className={`flex items-center ${shouldOverlap ? '-space-x-2' : 'gap-1'}`}>
          {visible.map((user) => (
            <Tooltip key={user.userID}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-caption bg-primary/10 text-primary">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-success border-2 border-background translate-x-[15%] translate-y-[15%]" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">{user.username}</p>
                <p className="text-muted-foreground">Online</p>
              </TooltipContent>
            </Tooltip>
          ))}

          {overflow > 0 && (
            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-caption text-muted-foreground">
              +{overflow}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}