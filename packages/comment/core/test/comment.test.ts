import {
  AuthenticatedActor,
  DomainEvent,
  EventPublisher,
  ValidationError,
  AccessDeniedError,
  NotFoundError,
  Errors,
} from 'shared'
import {
  Comment,
  CommentBody,
  CommentReplied,
  PostComment,
  EditComment,
  DeleteMyComment,
  DeleteComment,
  ListCommentsQuery,
  GetCommentHistoryQuery,
} from '../src'
import { CommentRepositoryInMemory } from './in-memory'

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }
const bettor: AuthenticatedActor = { id: 'user-1', role: 'user' }

const MATCH = 'match-1'

/** Collects what a use case published, so a test can assert on the fact itself. */
class EventPublisherSpy implements EventPublisher {
  readonly published: DomainEvent[] = []

  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events)
  }
}

function post(repository: CommentRepositoryInMemory, fields: Partial<Parameters<PostComment['execute']>[0]> = {}) {
  return new PostComment(repository).execute({
    subjectType: 'match',
    subjectId: MATCH,
    authorId: bettor.id,
    body: 'esse aí ganha fácil',
    subjectExists: true,
    ...fields,
  })
}

test('CommentBody trims, rejects an empty text and caps the length', () => {
  expect(new CommentBody('  vamo  ').value).toBe('vamo')
  expect(() => new CommentBody('   ')).toThrow(ValidationError)

  const tooLong = 'a'.repeat(CommentBody.MAX_LENGTH + 1)
  expect(() => new CommentBody(tooLong)).toThrow(ValidationError)
  expect(() => new CommentBody(tooLong)).toThrow(
    expect.objectContaining({ code: Errors.COMMENT_TOO_LONG }),
  )
})

test('CommentBody.preview collapses whitespace and cuts long texts', () => {
  expect(new CommentBody('quebra\n de   linha').preview).toBe('quebra de linha')
  expect(new CommentBody('b'.repeat(200)).preview).toHaveLength(CommentBody.PREVIEW_LENGTH + 1)
})

test('a comment needs a subject, an author and a body', () => {
  expect(() => new Comment({ subjectId: MATCH, authorId: bettor.id, body: 'oi' })).toThrow(ValidationError)
  expect(() => new Comment({ subjectType: 'match', authorId: bettor.id, body: 'oi' })).toThrow(ValidationError)
  expect(() => new Comment({ subjectType: 'match', subjectId: MATCH, body: 'oi' })).toThrow(ValidationError)
})

test('editing stamps editedAt and hands back the previous text', () => {
  const comment = new Comment({ subjectType: 'match', subjectId: MATCH, authorId: bettor.id, body: 'primeiro' })
  expect(comment.wasEdited).toBe(false)

  const revision = comment.edit('segundo')
  expect(comment.body.value).toBe('segundo')
  expect(comment.wasEdited).toBe(true)
  expect(revision?.body).toBe('primeiro')
  expect(revision?.commentId).toBe(comment.id.value)
})

test('re-submitting the same text is not an edit (no revision, no badge)', () => {
  const comment = new Comment({ subjectType: 'match', subjectId: MATCH, authorId: bettor.id, body: 'igual' })
  expect(comment.edit('  igual  ')).toBeNull()
  expect(comment.wasEdited).toBe(false)
})

test('a comment on a match/tournament that does not exist is rejected', async () => {
  const repository = new CommentRepositoryInMemory()
  const posting = post(repository, { subjectExists: false })

  await expect(posting).rejects.toBeInstanceOf(NotFoundError)
  await expect(posting).rejects.toMatchObject({ code: Errors.COMMENT_SUBJECT_NOT_FOUND })
})

test('the thread comes back as roots (newest first) with their replies', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'primeiro comentário' })
  const root = repository.comments[0].id
  await post(repository, { authorId: 'user-2', parentId: root, body: 'respondendo' })
  await post(repository, { body: 'outro comentário' })

  const thread = await new ListCommentsQuery(repository).execute({ subjectType: 'match', subjectId: MATCH })
  expect(thread).toHaveLength(2)
  expect(thread[0].body).toBe('outro comentário')
  expect(thread[1].replies.map((reply) => reply.body)).toEqual(['respondendo'])
})

test('replying notifies the author of the comment being answered', async () => {
  const repository = new CommentRepositoryInMemory()
  const events = new EventPublisherSpy()
  await post(repository, { body: 'aposta certa' })
  const root = repository.comments[0].id

  await new PostComment(repository, events).execute({
    subjectType: 'match',
    subjectId: MATCH,
    authorId: 'user-2',
    parentId: root,
    body: 'discordo total',
    subjectExists: true,
  })

  expect(events.published).toHaveLength(1)
  const [event] = events.published as CommentReplied[]
  expect(event).toBeInstanceOf(CommentReplied)
  expect(event.parentAuthorId).toBe(bettor.id)
  expect(event.authorId).toBe('user-2')
  expect(event.excerpt).toBe('discordo total')
})

test('answering YOURSELF raises nothing — nobody needs an inbox line about their own typing', async () => {
  const repository = new CommentRepositoryInMemory()
  const events = new EventPublisherSpy()
  await post(repository, { body: 'comentário raiz' })
  const root = repository.comments[0].id

  await new PostComment(repository, events).execute({
    subjectType: 'match',
    subjectId: MATCH,
    authorId: bettor.id,
    parentId: root,
    body: 'complementando o que eu disse',
    subjectExists: true,
  })

  expect(events.published).toHaveLength(0)
})

test('a reply to a reply is rejected — the thread is two levels deep', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'raiz' })
  const root = repository.comments[0].id
  await post(repository, { parentId: root, body: 'resposta' })
  const reply = repository.comments[1].id

  const nesting = post(repository, { parentId: reply, body: 'resposta da resposta' })
  await expect(nesting).rejects.toBeInstanceOf(ValidationError)
  await expect(nesting).rejects.toMatchObject({ code: Errors.INVALID_COMMENT_PARENT })
})

test('a reply cannot borrow a parent from another match', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'raiz da partida 1' })
  const root = repository.comments[0].id

  const crossing = post(repository, { subjectId: 'match-2', parentId: root, body: 'de outra partida' })
  await expect(crossing).rejects.toMatchObject({ code: Errors.INVALID_COMMENT_PARENT })
})

test('only the author edits their own comment, and the previous text is kept', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'texto original' })
  const commentId = repository.comments[0].id

  const stranger = new EditComment(repository).execute({ commentId, authorId: 'user-2', body: 'sequestrado' })
  await expect(stranger).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(stranger).rejects.toMatchObject({ code: Errors.NOT_COMMENT_AUTHOR })

  await new EditComment(repository).execute({ commentId, authorId: bettor.id, body: 'texto corrigido' })
  expect(repository.comments[0].body).toBe('texto corrigido')
  expect(repository.comments[0].editedAt).not.toBeNull()
  expect(repository.revisions.map((revision) => revision.body)).toEqual(['texto original'])
})

test('the admin reads the history: what it says now and what it said before', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'versão 1' })
  const commentId = repository.comments[0].id
  await new EditComment(repository).execute({ commentId, authorId: bettor.id, body: 'versão 2' })
  await new EditComment(repository).execute({ commentId, authorId: bettor.id, body: 'versão 3' })

  const history = await new GetCommentHistoryQuery(repository).execute({ commentId }, admin)
  expect(history.currentBody).toBe('versão 3')
  expect(history.revisions.map((revision) => revision.body)).toEqual(['versão 1', 'versão 2'])
})

test('a non-admin cannot read the edit history (NOT_ADMIN)', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'qualquer coisa' })
  const commentId = repository.comments[0].id

  const peeking = new GetCommentHistoryQuery(repository).execute({ commentId }, bettor)
  await expect(peeking).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(peeking).rejects.toMatchObject({ code: Errors.NOT_ADMIN })
})

test('the author withdraws their own comment: the row, the replies and the text stay put', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'me arrependi disso' })
  const root = repository.comments[0].id
  await post(repository, { authorId: 'user-2', parentId: root, body: 'resposta de outra pessoa' })

  await new DeleteMyComment(repository).execute({ commentId: root, authorId: bettor.id })

  // nothing was erased — that is the difference from the admin's bin
  expect(repository.comments).toHaveLength(2)
  expect(repository.comments[0].deletedAt).not.toBeNull()
  expect(repository.comments[0].body).toBe('me arrependi disso')
})

test('a withdrawn comment comes back to readers WITHOUT its text', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'texto que sai de cena' })
  const root = repository.comments[0].id
  await post(repository, { authorId: 'user-2', parentId: root, body: 'resposta que fica' })
  await new DeleteMyComment(repository).execute({ commentId: root, authorId: bettor.id })

  const thread = await new ListCommentsQuery(repository).execute({ subjectType: 'match', subjectId: MATCH })
  expect(thread[0].body).toBeNull()
  expect(thread[0].deletedAt).not.toBeNull()
  // the reply chain survives, which is the whole reason the delete is soft
  expect(thread[0].replies.map((reply) => reply.body)).toEqual(['resposta que fica'])
})

test('the admin still reads what was withdrawn', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'o que eu tinha escrito' })
  const commentId = repository.comments[0].id
  await new DeleteMyComment(repository).execute({ commentId, authorId: bettor.id })

  const history = await new GetCommentHistoryQuery(repository).execute({ commentId }, admin)
  expect(history.currentBody).toBe('o que eu tinha escrito')
  expect(history.deletedAt).not.toBeNull()
})

test('withdrawing is idempotent and only the author can do it', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'meu comentário' })
  const commentId = repository.comments[0].id

  const stranger = new DeleteMyComment(repository).execute({ commentId, authorId: 'user-2' })
  await expect(stranger).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(stranger).rejects.toMatchObject({ code: Errors.NOT_COMMENT_AUTHOR })

  await new DeleteMyComment(repository).execute({ commentId, authorId: bettor.id })
  const firstDeletedAt = repository.comments[0].deletedAt
  await new DeleteMyComment(repository).execute({ commentId, authorId: bettor.id })
  expect(repository.comments[0].deletedAt).toBe(firstDeletedAt)
})

test('a withdrawn comment can no longer be edited nor answered', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'some daqui' })
  const root = repository.comments[0].id
  await new DeleteMyComment(repository).execute({ commentId: root, authorId: bettor.id })

  const editing = new EditComment(repository).execute({ commentId: root, authorId: bettor.id, body: 'voltei' })
  await expect(editing).rejects.toBeInstanceOf(ValidationError)
  await expect(editing).rejects.toMatchObject({ code: Errors.COMMENT_DELETED })

  const replying = post(repository, { authorId: 'user-2', parentId: root, body: 'respondendo um túmulo' })
  await expect(replying).rejects.toMatchObject({ code: Errors.COMMENT_DELETED })
})

test('the admin deletes a root and its replies go with it', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'raiz' })
  const root = repository.comments[0].id
  await post(repository, { authorId: 'user-2', parentId: root, body: 'resposta' })
  await post(repository, { body: 'outra raiz' })

  await new DeleteComment(repository).execute({ commentId: root }, admin)

  expect(repository.comments.map((comment) => comment.body)).toEqual(['outra raiz'])
})

test('a non-admin cannot delete a comment (NOT_ADMIN)', async () => {
  const repository = new CommentRepositoryInMemory()
  await post(repository, { body: 'meu comentário' })
  const commentId = repository.comments[0].id

  const removing = new DeleteComment(repository).execute({ commentId }, bettor)
  await expect(removing).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(removing).rejects.toMatchObject({ code: Errors.NOT_ADMIN })
})
