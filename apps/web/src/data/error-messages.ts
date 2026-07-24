import { Errors } from 'shared'

// Friendly messages per domain code — STATIC data. The KEYS come from `shared`
// (single source of the codes); only the display text lives here (pt-BR for users).
export const ERROR_MESSAGES: Record<string, string> = {
  // auth
  [Errors.INVALID_EMAIL]: 'E-mail inválido.',
  [Errors.WEAK_PASSWORD]: 'A senha deve ter 8+ caracteres, com maiúscula, número e símbolo.',
  [Errors.PASSWORDS_DO_NOT_MATCH]: 'As senhas não conferem.',
  [Errors.USER_ALREADY_EXISTS]: 'Já existe uma conta com este e-mail.',
  [Errors.INVALID_EMAIL_OR_PASSWORD]: 'E-mail ou senha inválidos.',
  [Errors.INVALID_PASSWORD]: 'Senha incorreta.',
  [Errors.PASSWORD_SAME_AS_PREVIOUS]: 'A nova senha deve ser diferente da anterior.',
  [Errors.NOT_ADMIN]: 'Ação restrita ao administrador.',
  // wallet
  [Errors.INVALID_AMOUNT]: 'Valor inválido.',
  [Errors.INSUFFICIENT_BALANCE]: 'Saldo insuficiente.',
  [Errors.INVALID_STAKE]: 'Valor de aposta inválido.',
  [Errors.WITHDRAWAL_TOO_LARGE]: 'Valor de saque acima do disponível.',
  [Errors.PAYMENT_NOT_FOUND]: 'Pagamento não encontrado.',
  [Errors.PAYMENT_ALREADY_SETTLED]: 'Este pagamento já foi processado.',
  [Errors.DEPOSIT_LIMIT_EXCEEDED]: 'Esse depósito ultrapassa o limite que você definiu.',
  // match
  [Errors.MATCH_NOT_FOUND]: 'Partida não encontrada.',
  [Errors.MATCH_NOT_OPEN]: 'A partida não está aberta.',
  [Errors.MATCH_ALREADY_SETTLED]: 'A partida já foi encerrada.',
  [Errors.INVALID_MATCH_STATUS]: 'Ação inválida para o estado da partida.',
  [Errors.NOT_A_PARTICIPANT]: 'Selecione um participante válido.',
  [Errors.NOT_ENOUGH_PARTICIPANTS]: 'A partida precisa de pelo menos 2 participantes.',
  // betting
  [Errors.BETTING_CLOSED]: 'As apostas para esta partida estão encerradas.',
  [Errors.BET_NOT_FOUND]: 'Aposta não encontrada.',
  [Errors.INVALID_COMBO_LEGS]: 'O bilhete precisa de pelo menos 2 seleções.',
  [Errors.DUPLICATE_COMBO_MARKET]: 'Você já tem uma seleção desta partida/torneio no bilhete.',
  [Errors.INVALID_COMBO_ODD]: 'Não foi possível calcular a odd desta seleção.',
  // tournament
  [Errors.TOURNAMENT_NOT_FOUND]: 'Torneio não encontrado.',
  [Errors.INVALID_TOURNAMENT_SIZE]: 'O tamanho do torneio deve ser 2, 4, 8, 16 ou 32.',
  [Errors.NOT_ENOUGH_TOURNAMENT_PARTICIPANTS]:
    'Informe exatamente o número de participantes do tamanho escolhido.',
  [Errors.DUPLICATE_PARTICIPANT_NAME]: 'Os nomes dos participantes devem ser únicos.',
  [Errors.TOURNAMENT_NOT_OPEN]: 'O torneio não está em andamento.',
  [Errors.TOURNAMENT_ALREADY_FINISHED]: 'O torneio já foi finalizado.',
}
