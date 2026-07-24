import { TournamentDetail } from './components/tournament-detail'

export default function TournamentDetailPage({ params }: { params: { id: string } }) {
  return <TournamentDetail tournamentId={params.id} />
}
