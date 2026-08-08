'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { Loading } from '@/components/loading'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useCategoriesAdmin } from '../hooks/use-categories-admin'

export function Categories() {
  const { isAdmin, loading, ordered, pathOf, form, onSubmit, submitting, rename, remove } =
    useCategoriesAdmin()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  if (!isAdmin) {
    return <p className="text-sm text-slate-500">Área restrita ao administrador.</p>
  }

  if (loading) return <Loading />

  const startRename = (id: string, current: string) => {
    setEditingId(id)
    setEditName(current)
  }

  const saveRename = () => {
    if (editingId && editName.trim()) rename(editingId, editName.trim())
    setEditingId(null)
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Categorias</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-medium">Nova categoria</h2>

        <Field label="Nome" required {...form.register('name')} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">Dentro de (opcional)</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            {...form.register('parentId')}
          >
            <option value="">— raiz —</option>
            {ordered.map((category) => (
              <option key={category.id} value={category.id}>
                {pathOf(category.id)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Criando…' : 'Criar categoria'}
        </Button>
      </form>

      <div className="space-y-2">
        <h2 className="font-medium">Árvore</h2>
        {ordered.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma categoria ainda.</p>
        ) : (
          <ul className="space-y-2">
            {ordered.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                {editingId === category.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500"
                  />
                ) : (
                  <span className="text-sm">
                    <span className="text-slate-400">{pathOf(category.parentId)}</span>
                    {category.parentId && <span className="text-slate-400"> / </span>}
                    <span className="font-medium">{category.name}</span>
                    {category.isLeaf && <span className="ml-2 text-xs text-emerald-600">folha</span>}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {editingId === category.id ? (
                    <>
                      <Button onClick={saveRename}>Salvar</Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => startRename(category.id, category.name)}>
                        Renomear
                      </Button>
                      <Button variant="danger" onClick={() => setPendingDeleteId(category.id)}>
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
        title="Excluir categoria?"
        description={
          pendingDeleteId
            ? `"${pathOf(pendingDeleteId)}" será removida. Só é possível excluir uma categoria sem subcategorias.`
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
