import { mediaUrl } from '@/lib/media'
import { colorForId, initialsOf } from '@/lib/participant-colors'

interface ParticipantAvatarProps {
  // Stable id used to derive a fallback color when none is given — the same
  // participantId every other badge in the app already colors by.
  id: string
  name: string
  imageUrl?: string | null
  // Overrides the derived color (e.g. the match's draw pseudo-selection,
  // which has no participant behind it to color by).
  color?: string
  // Size (and any extra look, e.g. shadow-pixel) of the badge — required so
  // every call site is explicit about it, same as the spans this replaces.
  className: string
  // Font size of the initials fallback.
  textClassName?: string
}

/**
 * A participant's photo when the catalog has one, else the same colored
 * initials badge used everywhere already. Fixes places that always showed
 * initials even for a participant with a photo — the fallback is only for
 * when there truly is no photo.
 */
export function ParticipantAvatar({
  id,
  name,
  imageUrl,
  color,
  className,
  textClassName = 'text-[10px]',
}: ParticipantAvatarProps) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mediaUrl(imageUrl)} alt={name} className={`flex-none object-cover ${className}`} />
    )
  }

  return (
    <span
      className={`grid flex-none place-items-center font-pixel text-arcade-bg ${textClassName} ${className}`}
      style={{ backgroundColor: color ?? colorForId(id) }}
    >
      {initialsOf(name)}
    </span>
  )
}
