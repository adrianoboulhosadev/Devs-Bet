'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { ImageCropper } from '@/components/image-cropper'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'
import { useProfile } from '../hooks/use-profile'

export function Profile() {
  const {
    profile,
    loading,
    form,
    editingNickname,
    startEditingNickname,
    cancelEditingNickname,
    onSubmitNickname,
    savingNickname,
    onAvatarChange,
    uploadingAvatar,
  } = useProfile()
  const fileInput = useRef<HTMLInputElement>(null)
  // The picked file waits here while the user frames it; only the crop uploads.
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null)

  if (loading || !profile) return <Loading />

  const initials = (profile.nickname || profile.email).slice(0, 2).toUpperCase()
  const settled = profile.wins + profile.losses
  const winRate = settled === 0 ? null : Math.round((profile.wins / settled) * 100)
  const levelSpan = profile.xpIntoLevel + profile.xpToNextLevel
  const levelPct = levelSpan === 0 ? 0 : Math.round((profile.xpIntoLevel / levelSpan) * 100)

  return (
    <div className="animate-scrIn space-y-6">
      <div className="flex flex-wrap items-center gap-6 border-3 border-arcade-magenta bg-gradient-to-br from-[#2a1150] to-arcade-surface p-6 shadow-pixel-lg">
        <div className="relative">
          <span className="grid h-24 w-24 flex-none place-items-center overflow-hidden bg-arcade-cyan font-pixel text-2xl text-arcade-bg shadow-pixel">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(profile.avatarUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) setPendingAvatar(file)
              // Clearing lets the SAME file be picked again (no change event otherwise).
              event.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-2 -right-2 bg-arcade-amber px-2 py-1 font-pixel text-[8px] text-arcade-bg shadow-pixel-sm disabled:opacity-50"
          >
            {uploadingAvatar ? '…' : 'EDITAR'}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {editingNickname ? (
            <form onSubmit={onSubmitNickname} className="flex flex-wrap items-center gap-2.5">
              <input
                autoFocus
                {...form.register('nickname')}
                placeholder="seu apelido"
                className="border-3 border-arcade-border bg-[#0b0714] px-3 py-2 font-arcade text-2xl text-arcade-lime outline-none focus:border-arcade-cyan"
              />
              <Button type="submit" variant="success" disabled={savingNickname}>
                Salvar
              </Button>
              <Button type="button" variant="secondary" onClick={cancelEditingNickname}>
                Cancelar
              </Button>
            </form>
          ) : (
            <button type="button" onClick={startEditingNickname} className="text-left">
              <span className="text-3xl leading-tight text-arcade-text hover:text-arcade-lime">
                {profile.nickname || profile.email.split('@')[0]}
              </span>
              <span className="ml-2 font-arcade text-lg text-arcade-text-muted">editar</span>
            </button>
          )}
          <p className="font-arcade text-lg text-arcade-text-muted">{profile.email}</p>
          <p className="mt-1 font-pixel text-[9px] tracking-widest text-arcade-text-muted">
            INGRESSOU EM {formatDateTime(profile.createdAt).toUpperCase()}
          </p>
        </div>
      </div>

      <div className="border-3 border-arcade-lime bg-arcade-surface p-6 shadow-pixel-lg">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <span className="font-pixel text-sm tracking-wide text-arcade-lime">NÍVEL {profile.level}</span>
          <span className="font-arcade text-lg text-arcade-text-muted">
            {profile.xpIntoLevel} / {levelSpan} XP até o nível {profile.level + 1}
          </span>
        </div>
        <div className="h-4 border-2 border-arcade-border bg-[#0b0714]">
          <div className="h-full bg-arcade-lime transition-all" style={{ width: `${levelPct}%` }} />
        </div>
        <p className="mt-2 font-arcade text-base text-arcade-text-muted">
          {profile.xp} XP acumulado no total · ganhe XP acertando apostas — múltiplas valem mais
        </p>
      </div>

      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]">
        <div className="border-3 border-arcade-border bg-arcade-surface px-5 py-4 shadow-pixel">
          <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">VITÓRIAS</p>
          <p className="text-4xl leading-tight text-arcade-lime">{profile.wins}</p>
        </div>
        <div className="border-3 border-arcade-border bg-arcade-surface px-5 py-4 shadow-pixel">
          <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">DERROTAS</p>
          <p className="text-4xl leading-tight text-arcade-danger">{profile.losses}</p>
        </div>
        <div className="border-3 border-arcade-border bg-arcade-surface px-5 py-4 shadow-pixel">
          <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">APROVEITAMENTO</p>
          <p className="text-4xl leading-tight text-arcade-amber">{winRate === null ? '—' : `${winRate}%`}</p>
        </div>
      </div>

      {pendingAvatar && (
        <ImageCropper
          file={pendingAvatar}
          preset="square"
          onConfirm={(cropped) => {
            setPendingAvatar(null)
            onAvatarChange(cropped)
          }}
          onCancel={() => setPendingAvatar(null)}
        />
      )}
    </div>
  )
}
