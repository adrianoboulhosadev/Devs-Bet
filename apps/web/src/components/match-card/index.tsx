import Link from 'next/link'
import type { MatchDTO } from '@match/adapters'
import { StatusBadge } from '@/components/status-badge'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'

interface MatchCardProps {
  match: MatchDTO
  categoryPath: string
}

/**
 * The one visual card for a match — used by the /matches lobby and the
 * dashboard's bets section alike, so the same match never renders two
 * different ways depending on which screen linked to it.
 */
export function MatchCard({ match, categoryPath }: MatchCardProps) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="block border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:border-arcade-magenta hover:shadow-pixel-hover"
    >
      <div className="flex items-center justify-between border-b-3 border-arcade-border-strong bg-[#1d1233] px-4 py-2.5">
        <span className="font-pixel text-[8px] tracking-widest text-arcade-text-muted">
          {categoryPath.toUpperCase()}
        </span>
        <StatusBadge status={match.status} />
      </div>
      {match.imageUrl && (
        // aspect-video matches the cropper's banner preset, so the card shows
        // exactly the framing that was chosen — no extra cropping.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(match.imageUrl)} alt={match.title} className="aspect-video w-full border-b-3 border-arcade-border-strong object-cover" />
      )}
      <div className="p-4">
        <p className="mb-2 text-2xl leading-tight text-arcade-text">{match.title}</p>
        <p className="font-arcade text-lg text-arcade-text-muted">
          {match.participants.map((participant) => participant.displayName).join(' × ')}
        </p>
        <p className="mt-1 font-arcade text-base text-arcade-text-muted">
          {formatDateTime(match.scheduledAt)}
          {match.bestOf > 1 && ` · MD${match.bestOf}`}
        </p>
      </div>
    </Link>
  )
}
