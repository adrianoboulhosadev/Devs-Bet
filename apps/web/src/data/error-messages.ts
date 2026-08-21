import { Errors } from 'shared'

// Friendly messages per domain code — STATIC data. The KEYS come from `shared`
// (single source of the codes); only the display text lives here (pt-BR for users).
export const ERROR_MESSAGES: Record<string, string> = {
  // shared
  [Errors.REQUIRED_FIELD]: 'Preencha todos os campos obrigatórios.',
  // auth
  [Errors.INVALID_EMAIL]: 'E-mail inválido.',
  [Errors.WEAK_PASSWORD]: 'A senha deve ter 8+ caracteres, com maiúscula, número e símbolo.',
  [Errors.PASSWORDS_DO_NOT_MATCH]: 'As senhas não conferem.',
  [Errors.USER_ALREADY_EXISTS]: 'Já existe uma conta com este e-mail.',
  [Errors.USER_NOT_FOUND]: 'Usuário não encontrado.',
  [Errors.INVALID_EMAIL_OR_PASSWORD]: 'E-mail ou senha inválidos.',
  [Errors.INVALID_PASSWORD]: 'Senha incorreta.',
  [Errors.PASSWORD_SAME_AS_PREVIOUS]: 'A nova senha deve ser diferente da anterior.',
  [Errors.NOT_AUTHENTICATED]: 'Sua sessão expirou. Entre novamente.',
  [Errors.INVALID_SESSION]: 'Sua sessão expirou. Entre novamente.',
  [Errors.NOT_ADMIN]: 'Ação restrita ao administrador.',
  [Errors.ACCOUNT_PENDING_APPROVAL]:
    'Seu cadastro ainda não foi aprovado. Assim que o administrador liberar, você consegue entrar.',
  [Errors.OAUTH_TOKEN_INVALID]: 'Não foi possível validar seu login com o Google.',
  [Errors.OAUTH_EMAIL_NOT_VERIFIED]: 'O Google não confirmou este e-mail. Use e-mail e senha.',
  // wallet
  [Errors.INVALID_AMOUNT]: 'Valor inválido.',
  [Errors.WALLET_NOT_FOUND]: 'Carteira não encontrada.',
  [Errors.INSUFFICIENT_BALANCE]: 'Saldo insuficiente.',
  [Errors.INVALID_STAKE]: 'Valor de aposta inválido.',
  [Errors.WITHDRAWAL_TOO_LARGE]: 'Valor de saque acima do disponível.',
  [Errors.PAYMENT_NOT_FOUND]: 'Pagamento não encontrado.',
  [Errors.PAYMENT_ALREADY_SETTLED]: 'Este pagamento já foi processado.',
  [Errors.RECEIPT_REQUIRED]: 'Envie o comprovante de pagamento para concluir o depósito.',
  [Errors.DEPOSIT_LIMIT_EXCEEDED]: 'Esse depósito ultrapassa o limite que você definiu.',
  [Errors.WALLET_BUSY]: 'Sua carteira está processando outra operação. Tente de novo em instantes.',
  [Errors.SELF_EXCLUDED]: 'Sua autoexclusão está ativa — depósitos e apostas estão bloqueados.',
  [Errors.ALREADY_SELF_EXCLUDED]: 'Você já tem uma autoexclusão ativa.',
  // match
  [Errors.MATCH_NOT_FOUND]: 'Partida não encontrada.',
  [Errors.MATCH_NOT_OPEN]: 'A partida não está aberta.',
  [Errors.MATCH_ALREADY_SETTLED]: 'A partida já foi encerrada.',
  [Errors.INVALID_MATCH_STATUS]: 'Ação inválida para o estado da partida.',
  [Errors.NOT_A_PARTICIPANT]: 'Selecione um participante válido.',
  [Errors.NOT_ENOUGH_PARTICIPANTS]: 'A partida precisa de pelo menos 2 participantes.',
  [Errors.SCHEDULED_IN_PAST]: 'A data e hora da partida precisa estar no futuro.',
  [Errors.DRAW_NOT_ALLOWED]: 'Esta partida não pode terminar empatada.',
  [Errors.INVALID_BEST_OF]: 'O "melhor de" precisa ser 1, 3 ou 5.',
  [Errors.INVALID_UNIT_NUMBER]: 'Não foi possível registrar o resultado desta unidade.',
  // betting
  [Errors.BETTING_CLOSED]: 'As apostas para esta partida estão encerradas.',
  [Errors.BET_NOT_FOUND]: 'Aposta não encontrada.',
  [Errors.BET_NOT_OPEN]: 'Esta aposta já foi resolvida e não pode mais ser cancelada.',
  [Errors.INVALID_COMBO_LEGS]: 'A múltipla precisa de pelo menos 2 seleções.',
  [Errors.DUPLICATE_COMBO_MARKET]: 'Você já tem uma seleção desta partida/torneio na múltipla.',
  [Errors.INVALID_COMBO_ODD]: 'Não foi possível calcular a odd desta seleção.',
  [Errors.STAKE_LIMIT_EXCEEDED]: 'Essa aposta ultrapassa o limite diário que você definiu.',
  // category
  [Errors.CATEGORY_NOT_FOUND]: 'Categoria não encontrada.',
  [Errors.CATEGORY_NOT_LEAF]: 'Escolha a categoria até o nível mais específico.',
  [Errors.CATEGORY_HAS_CHILDREN]: 'Só é possível excluir uma categoria sem subcategorias.',
  [Errors.CATEGORY_ALREADY_EXISTS]: 'Já existe uma categoria com esse nome aqui.',
  // participant
  [Errors.PARTICIPANT_NOT_FOUND]: 'Participante não encontrado.',
  [Errors.PARTICIPANT_ALREADY_EXISTS]: 'Já existe um participante com esse nome.',
  [Errors.PARTICIPANT_IN_USE]: 'Este participante já foi usado em uma partida/torneio.',
  // tournament
  [Errors.TOURNAMENT_NOT_FOUND]: 'Torneio não encontrado.',
  [Errors.INVALID_TOURNAMENT_SIZE]: 'O tamanho do torneio deve ser 2, 4, 8, 16, 32, 64 ou 128.',
  [Errors.NOT_ENOUGH_TOURNAMENT_PARTICIPANTS]:
    'Informe exatamente o número de participantes do tamanho escolhido.',
  [Errors.DUPLICATE_PARTICIPANT_NAME]: 'Os nomes dos participantes devem ser únicos.',
  [Errors.TOURNAMENT_NOT_OPEN]: 'O torneio não está em andamento.',
  [Errors.TOURNAMENT_ALREADY_FINISHED]: 'O torneio já foi finalizado.',
  [Errors.BRACKET_SLOT_NOT_FOUND]: 'Confronto não encontrado no chaveamento.',
  // comment
  [Errors.COMMENT_NOT_FOUND]: 'Comentário não encontrado.',
  [Errors.COMMENT_TOO_LONG]: 'Comentário muito longo. Escreva algo mais curto.',
  [Errors.COMMENT_SUBJECT_NOT_FOUND]: 'A partida ou torneio deste comentário não existe mais.',
  [Errors.INVALID_COMMENT_PARENT]: 'Não foi possível responder a este comentário.',
  [Errors.NOT_COMMENT_AUTHOR]: 'Só dá pra editar os seus próprios comentários.',
}
