'use client'

import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { Loading } from '@/components/loading'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useCategoriesAdmin } from './hooks/use-categories-admin'

export default function CategoriesPage() {
  const {
    isAdmin,
    loading,
    ordered,
    pathOf,
    form,
    onSubmit,
    submitting,
    remove,
    editingId,
    editName,
    setEditName,
    pendingDeleteId,
    setPendingDeleteId,
    startRename,
    cancelRename,
    saveRename,
  } = useCategoriesAdmin()

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
      <form onSubmit={onSubmit} className="space-y-4 border-3 border-arcade-amber bg-arcade-surface p-6 shadow-pixel-lg">
        <h2 className="font-pixel text-xs tracking-wide text-arcade-amber">NOVA CATEGORIA</h2>

        <Field label="NOME" required {...form.register('name')} />
        <label className="block space-y-2">
          <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">DENTRO DE (OPCIONAL)</span>
          <select
            className="w-full border-3 border-arcade-border bg-[#0b0714] px-3 py-2.5 font-arcade text-xl text-arcade-text outline-none focus:border-arcade-cyan"
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
        <Button type="submit" variant="warning" disabled={submitting}>
          {submitting ? 'Criando…' : 'Criar categoria'}
        </Button>
      </form>

      <div className="space-y-2.5">
        <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">ÁRVORE</h2>
        {ordered.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Nenhuma categoria ainda.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {ordered.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-3 border-3 border-arcade-border bg-arcade-surface p-3.5 shadow-pixel-sm"
              >
                {editingId === category.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="border-3 border-arcade-border bg-[#0b0714] px-2.5 py-1.5 font-arcade text-lg text-arcade-text outline-none focus:border-arcade-cyan"
                  />
                ) : (
                  // `w-full` no celular: sem isso um nome curto ("Games") cabia
                  // na mesma linha dos botões e a lista ficava desalinhada com as
                  // categorias de caminho longo, que já quebravam pra cima deles.
                  <span className="w-full font-arcade text-lg sm:w-auto">
                    <span className="text-arcade-text-muted">{pathOf(category.parentId)}</span>
                    {category.parentId && <span className="text-arcade-text-muted"> / </span>}
                    <span className="text-arcade-text">{category.name}</span>
                    {category.isLeaf && <span className="ml-2 font-pixel text-[8px] text-arcade-lime">FOLHA</span>}
                  </span>
                )}

                <div className="flex items-center gap-2.5">
                  {editingId === category.id ? (
                    <>
                      <Button variant="warning" onClick={saveRename}>
                        Salvar
                      </Button>
                      <Button variant="secondary" onClick={cancelRename}>
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
