import { Entity, EntityProps, Money, ValidationError, Errors } from 'shared'
import { NotificationInput, NotificationType, NOTIFICATION_TYPES } from './notification-input'

export interface NotificationProps extends EntityProps {
  userId?: string
  type?: NotificationType
  title?: string
  body?: string
  /** Where clicking it takes the user (a front route). Null = nowhere to go. */
  link?: string | null
  referenceId?: string | null
  readAt?: Date | null
  createdAt?: Date
}

/** Formats cents as BRL without relying on Intl's locale data (which would
 * vary between the API container and the worker). Money already guarantees a
 * non-negative integer. */
function formatMoney(cents: number): string {
  const [reais, centavos] = (new Money(cents).cents / 100).toFixed(2).split('.')
  return `R$ ${reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`
}

/**
 * One line in a user's inbox (rich entity).
 *
 * The COPY lives here, not in the callers: three different apps raise
 * notifications (backend on an admin action, worker on a settlement), and
 * `Notification.for` is what keeps "what we tell the user" a single decision
 * of the domain instead of strings scattered across controllers. The text is
 * stored already rendered — a notification is a record of what was said at the
 * time, so a later wording change never rewrites history.
 */
export class Notification extends Entity<Notification, NotificationProps> {
  readonly userId: string
  readonly type: NotificationType
  readonly title: string
  readonly body: string
  readonly link: string | null
  readonly referenceId: string | null
  readonly createdAt: Date
  readAt: Date | null

  constructor(props: NotificationProps) {
    super(props)
    const userId = props.userId?.trim() ?? ''
    if (!userId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'userId')

    const title = props.title?.trim() ?? ''
    if (!title) ValidationError.throwError(Errors.REQUIRED_FIELD, 'title')

    const body = props.body?.trim() ?? ''
    if (!body) ValidationError.throwError(Errors.REQUIRED_FIELD, 'body')

    if (!props.type || !NOTIFICATION_TYPES.includes(props.type)) {
      ValidationError.throwError(Errors.REQUIRED_FIELD, 'type')
    }

    this.userId = userId
    this.type = props.type
    this.title = title
    this.body = body
    this.link = props.link ?? null
    this.referenceId = props.referenceId ?? null
    this.readAt = props.readAt ?? null
    this.createdAt = props.createdAt ?? new Date()
  }

  get isRead(): boolean {
    return this.readAt !== null
  }

  /** Idempotent: re-reading an already-read notification keeps the original
   * timestamp (marking all as read must not rewrite the whole inbox). */
  markAsRead(): void {
    if (this.readAt) return
    this.readAt = new Date()
  }

  /** Builds the finished notification for an event. Every branch is exhaustive
   * over NotificationInput, so adding a type without its copy fails the build. */
  static for(input: NotificationInput): Notification {
    const { title, body, link } = Notification.render(input)
    return new Notification({
      userId: input.userId,
      type: input.type,
      referenceId: input.referenceId,
      title,
      body,
      link,
    })
  }

  private static render(input: NotificationInput): {
    title: string
    body: string
    link: string | null
  } {
    switch (input.type) {
      case 'bet_won':
        return {
          title: 'Aposta vencedora',
          body: `Você acertou em "${input.marketTitle}" e recebeu ${formatMoney(input.payout)}.`,
          link: Notification.marketLink(input.marketKind, input.marketId),
        }
      case 'bet_lost':
        return {
          title: 'Aposta perdida',
          body: `Sua aposta de ${formatMoney(input.stake)} em "${input.marketTitle}" não deu certo desta vez.`,
          link: Notification.marketLink(input.marketKind, input.marketId),
        }
      case 'bet_refunded':
        return {
          title: 'Aposta estornada',
          body: `"${input.marketTitle}" foi cancelada e ${formatMoney(input.stake)} voltou pra sua carteira.`,
          link: Notification.marketLink(input.marketKind, input.marketId),
        }
      case 'combo_won':
        return {
          title: 'Múltipla vencedora',
          body: `Sua múltipla de ${input.legs} seleções bateu tudo e pagou ${formatMoney(input.payout)}.`,
          link: '/bets',
        }
      case 'combo_lost':
        return {
          title: 'Múltipla perdida',
          body: `Uma das ${input.legs} seleções do seu bilhete não entrou. Os ${formatMoney(input.stake)} apostados se foram.`,
          link: '/bets',
        }
      case 'combo_refunded':
        return {
          title: 'Múltipla estornada',
          body: `Um mercado da sua múltipla de ${input.legs} seleções foi cancelado e ${formatMoney(input.stake)} voltou pra sua carteira.`,
          link: '/bets',
        }
      case 'deposit_confirmed':
        return {
          title: 'Depósito aprovado',
          body: `${formatMoney(input.amount)} entrou na sua carteira.`,
          link: '/wallet',
        }
      case 'deposit_rejected':
        return {
          title: 'Depósito recusado',
          body: `Seu depósito de ${formatMoney(input.amount)} não foi aprovado.`,
          link: '/wallet',
        }
      case 'withdrawal_paid':
        return {
          title: 'Saque pago',
          body: `${formatMoney(input.amount)} saiu da sua carteira e foi enviado.`,
          link: '/wallet',
        }
      case 'withdrawal_rejected':
        return {
          title: 'Saque recusado',
          body: `Seu saque de ${formatMoney(input.amount)} foi recusado e o valor segue disponível.`,
          link: '/wallet',
        }
      case 'account_approved':
        return {
          title: 'Conta liberada',
          body: 'Seu cadastro foi aprovado. Bem-vindo ao Devs-Bet!',
          link: '/dashboard',
        }
      // The signup notice carries the e-mail on purpose: it goes only to admins,
      // and it is the same reason the control room shows it — without it the
      // owner cannot tell which friend is asking to get in.
      case 'admin_signup_pending':
        return {
          title: 'Novo cadastro',
          body: `${input.signupEmail} se cadastrou e está esperando aprovação.`,
          link: '/admin',
        }
      case 'admin_deposit_pending':
        return {
          title: 'Depósito pendente',
          body: `${input.bettorLabel} pediu um depósito de ${formatMoney(input.amount)} e enviou o comprovante.`,
          link: '/admin',
        }
      case 'admin_withdrawal_pending':
        return {
          title: 'Saque pendente',
          body: `${input.bettorLabel} pediu um saque de ${formatMoney(input.amount)}.`,
          link: '/admin',
        }
    }
  }

  private static marketLink(kind: 'match' | 'tournament', marketId: string): string {
    return kind === 'match' ? `/matches/${marketId}` : `/tournaments/${marketId}`
  }
}
