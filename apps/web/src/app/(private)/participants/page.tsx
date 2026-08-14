'use client'

import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { Loading } from '@/components/loading'
import { mediaUrl } from '@/lib/media'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ImagePicker } from '@/components/image-picker'
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

  if (!isAdmin) {
    return (
      <p className="border-3 border-arcade-danger bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-danger">
        Área restrita ao administrador.
      </p>
    )
  }

  if (loading) return <Loading />

  return (
    <div className="animate-scrIn space-y-7">
      <p className="font-arcade text-lg text-arcade-text-muted">
        Cadastro reaproveitável — quem entra numa partida ou torneio é escolhido daqui.
      </p>

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

      <div className="space-y-2.5">
        <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">CATÁLOGO</h2>
        {participants.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Nenhum participante ainda.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {participants.map((participant) => (
              <li
                key={participant.id}
                className="flex flex-wrap items-center justify-between gap-3 border-3 border-arcade-border bg-arcade-surface p-3.5 shadow-pixel-sm"
              >
                <div className="flex items-center gap-3">
                  {participant.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(participant.imageUrl)} alt={participant.name} className="h-10 w-10 object-cover" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 bg-arcade-border" />
                  )}

                  {editingId === participant.id ? (
                    <div className="flex flex-col gap-1.5">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder="Nome"
                        className="border-2 border-arcade-border bg-[#0b0714] px-2.5 py-1 font-arcade text-lg text-arcade-text outline-none focus:border-arcade-cyan"
                      />
                      <input
                        value={editNickname}
                        onChange={(event) => setEditNickname(event.target.value)}
                        placeholder="Apelido"
                        className="border-2 border-arcade-border bg-[#0b0714] px-2.5 py-1 font-arcade text-lg text-arcade-text outline-none focus:border-arcade-cyan"
                      />
                    </div>
                  ) : (
                    <span className="font-arcade text-lg">
                      <span className="text-arcade-text">{participant.name}</span>
                      {participant.nickname && (
                        <span className="ml-2 text-base text-arcade-text-muted">"{participant.nickname}"</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
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
    </div>
  )
}
