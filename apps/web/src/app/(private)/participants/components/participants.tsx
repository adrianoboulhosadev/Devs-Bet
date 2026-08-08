'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { Loading } from '@/components/loading'
import { mediaUrl } from '@/lib/media'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useParticipantsAdmin } from '../hooks/use-participants-admin'

export function Participants() {
  const { isAdmin, loading, participants, form, onSubmit, submitting, updateParticipant, remove } =
    useParticipantsAdmin()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNickname, setEditNickname] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  if (!isAdmin) {
    return <p className="text-sm text-slate-500">Área restrita ao administrador.</p>
  }

  if (loading) return <Loading />

  const startEdit = (id: string, name: string, nickname: string | null) => {
    setEditingId(id)
    setEditName(name)
    setEditNickname(nickname ?? '')
  }

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateParticipant(editingId, { name: editName.trim(), nickname: editNickname.trim() || null })
    }
    setEditingId(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Participantes</h1>
        <p className="text-sm text-slate-500">
          Cadastro reaproveitável — quem entra numa partida ou torneio é escolhido daqui.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-medium">Novo participante</h2>

        <Field label="Nome" required {...form.register('name')} />
        <Field label="Apelido (opcional)" {...form.register('nickname')} />
        <Field label="Foto (opcional)" type="file" accept="image/*" {...form.register('image')} />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Criando…' : 'Criar participante'}
        </Button>
      </form>

      <div className="space-y-2">
        <h2 className="font-medium">Catálogo</h2>
        {participants.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum participante ainda.</p>
        ) : (
          <ul className="space-y-2">
            {participants.map((participant) => (
              <li
                key={participant.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  {participant.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(participant.imageUrl)}
                      alt={participant.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
                  )}

                  {editingId === participant.id ? (
                    <div className="flex flex-col gap-1">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder="Nome"
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500"
                      />
                      <input
                        value={editNickname}
                        onChange={(event) => setEditNickname(event.target.value)}
                        placeholder="Apelido"
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500"
                      />
                    </div>
                  ) : (
                    <span className="text-sm">
                      <span className="font-medium">{participant.name}</span>
                      {participant.nickname && (
                        <span className="ml-2 text-xs text-slate-400">"{participant.nickname}"</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingId === participant.id ? (
                    <>
                      <Button onClick={saveEdit}>Salvar</Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>
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
