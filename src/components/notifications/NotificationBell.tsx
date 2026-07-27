'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications } from '@/hooks/useNotifications'
import { useMarkNotificationRead } from '@/hooks/useNotifications'

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data, fetchNextPage, hasNextPage } = useNotifications()
  const markRead = useMarkNotificationRead()

  const notifications = data?.pages.flatMap((p) => p.notifications) ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-body font-medium text-foreground">Notifications</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="px-4 py-6 text-caption text-muted-foreground text-center">No notifications yet</p>
          )}
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={`/boards/${n.boardID}`}
              onClick={() => { if (!n.isRead) markRead.mutate(n.id); setOpen(false) }}
              className={`block px-4 py-3 border-b border-border last:border-0 hover:bg-hover transition-colors ${!n.isRead ? 'bg-info-subtle' : ''}`}
            >
              <p className="text-body text-foreground">{n.message}</p>
              <p className="text-caption text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
            </Link>
          ))}
          {hasNextPage && (
            <button onClick={() => fetchNextPage()} className="w-full py-2 text-caption text-primary hover:bg-hover transition-colors">
              Load more
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}