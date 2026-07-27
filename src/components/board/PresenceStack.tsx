'use client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePresence } from '@/hooks/realtime/usePresence'

export function PresenceStack({ boardId }: { boardId: string }) {
  const onlineUsers = usePresence(boardId)
  if (onlineUsers.length === 0) return null

  const visible = onlineUsers.slice(0, 4)
  const overflow = onlineUsers.length - visible.length

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <span key={user.userID} title={user.username}>
         <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-success">
            <AvatarFallback className="text-caption bg-primary/10 text-primary">
                {user.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
        </Avatar>
        </span>
      ))}
      {overflow > 0 && (
        <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-caption text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  )
}