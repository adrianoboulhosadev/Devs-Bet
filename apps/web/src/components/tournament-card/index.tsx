import Link from 'next/link'
import type { TournamentDTO } from '@tournament/adapters'
import { StatusBadge } from '@/components/status-badge'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'

interface TournamentCardProps {
  tournament: TournamentDTO
  categoryPath: string
}

/** The one visual card for a tournament — used by the /tournaments lobby and
 * the dashboard's tournaments section alike. */
export function TournamentCard({ tournament, categoryPath }: TournamentCardProps) {
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="block border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:border-arcade-lime hover:shadow-pixel-hover"
    >
      <div className="flex items-center justify-between border-b-3 border-arcade-border-strong bg-[#1d1233] px-4 py-2.5">
        <span className="text-2xl text-arcade-text">{tournament.title}</span>
        <StatusBadge status={tournament.status} />
      </div>
      {tournament.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(tournament.imageUrl)} alt={tournament.title} className="aspect-[3/2] w-full border-b-3 border-arcade-border-strong object-cover" />
      )}
      <div className="p-4">
        <p className="font-arcade text-lg text-arcade-text-muted">{tournament.size} participantes</p>
        <p className="mt-1 font-arcade text-base text-arcade-text-muted">
          {categoryPath} · {formatDateTime(tournament.scheduledAt)}
        </p>
      </div>
    </Link>
  )
}
