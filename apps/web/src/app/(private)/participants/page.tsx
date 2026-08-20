'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { Loading } from '@/components/loading'
import { mediaUrl } from '@/lib/media'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ImagePicker } from '@/components/image-picker'
import { ImageLightbox } from '@/components/image-lightbox'
import { useParticipantsAdmin } from './hooks/use-participants-admin'

export default function ParticipantsPage() {
  const {
    isAdmin,
    loading,
    participants,
    form,
    onSubmit,
    submitting,
    remove,
    editingId,
    editName,
    setEditName,
    editNickname,
    setEditNickname,
    pendingDeleteId,
    setPendingDeleteId,
    startEdit,
    cancelEdit,
    saveEdit,
  } = useParticipantsAdmin()
  const [expandedImage, setExpandedImage] = useState<{ url: string; alt: string } | null>(null)

  if (loading) return <Loading />

  return (
    <div className="animate-scrIn space-y-7">
      <p className="font-arcade text-lg text-arcade-text-muted">
        Cadastro reaproveitável — quem entra numa partida ou torneio é escolhido daqui.
      </p>

      {isAdmin && (
        <form onSubmit={onSubmit} className="space-y-4 border-3 border-arcade-amber bg-arcade-surface p-6 shadow-pixel-lg">
          <h2 className="font-pixel text-xs tracking-wide text-arcade-amber">NOVO PARTICIPANTE</h2>

          <Field label="NOME" required {...form.register('name')} />
          <Field label="APELIDO (OPCIONAL)" {...form.register('nickname')} />
          <ImagePicker
            label="FOTO (OPCIONAL)"
            preset="square"
            value={form.watch('image')}
            onChange={(file) => form.setValue('image', file)}
          />

          <Button type="submit" variant="warning" disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar participante'}
          </Button>
        </form>
      )}

      <div className="space-y-2.5">
        <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">CATÁLOGO</h2>
        {participants.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Nenhum participante ainda.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {participants.map((participant) => (
              // `flex-col` pelo mesmo motivo da lista de categorias: com
              // `flex-wrap justify-between` o card mudava de layout conforme o
              // tamanho do nome. Empilhado, a ficha fica sempre acima dos botões.
              <li
                key={participant.id}
                className="flex flex-col items-start gap-3 border-3 border-arcade-border bg-arcade-surface p-3.5 shadow-pixel-sm"
              >
                <div className="flex w-full min-w-0 items-center gap-3">
                  {participant.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setExpandedImage({ url: mediaUrl(participant.imageUrl!), alt: participant.name })}
                      aria-label={`Ampliar foto de ${participant.name}`}
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(participant.imageUrl)} alt={participant.name} className="h-10 w-10 object-cover" />
                    </button>
                  ) : (
                    <span className="h-10 w-10 shrink-0 bg-arcade-border" />
                  )}

                  {editingId === participant.id ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder="Nome"
                        className="w-full min-w-0 border-2 border-arcade-border bg-[#0b0714] px-2.5 py-1 font-arcade text-lg text-arcade-text outline-none focus:border-arcade-cyan"
                      />
                      <input
                        value={editNickname}
                        onChange={(event) => setEditNickname(event.target.value)}
                        placeholder="Apelido"
                        className="w-full min-w-0 border-2 border-arcade-border bg-[#0b0714] px-2.5 py-1 font-arcade text-lg text-arcade-text outline-none focus:border-arcade-cyan"
                      />
                    </div>
                  ) : (
                    // Apelido numa LINHA PRÓPRIA, abaixo do nome: inline, um nome
                    // comprido quebrava no meio e o apelido ficava pendurado no
                    // fim da quebra, parecendo parte do nome.
                    <span className="flex min-w-0 flex-col font-arcade text-lg">
                      <span className="break-words text-arcade-text">{participant.name}</span>
                      {participant.nickname && (
                        <span className="break-words text-base text-arcade-text-muted">"{participant.nickname}"</span>
                      )}
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {editingId === participant.id ? (
                      <>
                        <Button variant="warning" onClick={saveEdit}>
                          Salvar
                        </Button>
                        <Button variant="secondary" onClick={cancelEdit}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => startEdit(participant.id, participant.name, participant.nickname)}
                        >
                          Editar
                        </Button>
                        <Button variant="danger" onClick={() => setPendingDeleteId(participant.id)}>
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Excluir participante?"
        description={
          pendingDeleteId
            ? `"${participants.find((entry) => entry.id === pendingDeleteId)?.name ?? ''}" sai do catálogo. Só é possível excluir quem nunca foi usado em uma partida ou torneio.`
            : undefined
        }
        onConfirm={() => {
          if (pendingDeleteId) remove(pendingDeleteId)
          setPendingDeleteId(null)
        }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <ImageLightbox
        src={expandedImage?.url ?? null}
        alt={expandedImage?.alt ?? ''}
        onClose={() => setExpandedImage(null)}
      />
    </div>
  )
}
