import Link from 'next/link'
import type { PollDTO } from '@poll/adapters'
import { StatusBadge } from '@/components/status-badge'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'

interface PollCardProps {
  poll: PollDTO
  categoryPath: string
}

/**
 * The one visual card for a poll — used by the /polls lobby and anywhere else
 * a poll is listed, so the same poll never renders two different ways
 * depending on which screen linked to it (same call as MatchCard).
 */
export function PollCard({ poll, categoryPath }: PollCardProps) {
  const winner = poll.options.find((option) => option.id === poll.winningOptionId)

  return (
    <Link
      href={`/polls/${poll.id}`}
      className="block border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:border-arcade-magenta hover:shadow-pixel-hover"
    >
      <div className="flex items-center justify-between border-b-3 border-arcade-border-strong bg-[#1d1233] px-4 py-2.5">
        <span className="font-pixel text-[8px] tracking-widest text-arcade-text-muted">
          {categoryPath.toUpperCase()}
        </span>
        <StatusBadge status={poll.status} />
      </div>
      {poll.imageUrl && (
        // aspect-video matches the cropper's banner preset, so the card shows
        // exactly the framing that was chosen — no extra cropping.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(poll.imageUrl)}
          alt={poll.question}
          className="aspect-video w-full border-b-3 border-arcade-border-strong object-cover"
        />
      )}
      <div className="p-4">
        <p className="mb-2 text-2xl leading-tight text-arcade-text">{poll.question}</p>
        <p className="font-arcade text-lg text-arcade-text-muted">
          {poll.options.map((option) => option.label).join(' · ')}
        </p>
        <p className="mt-1 font-arcade text-base text-arcade-text-muted">
          {winner ? `Respondida: ${winner.label}` : `Apostas até ${formatDateTime(poll.closesAt)}`}
        </p>
      </div>
    </Link>
  )
}
