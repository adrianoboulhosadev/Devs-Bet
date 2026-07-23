import { MatchDetail } from './components/match-detail'

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  return <MatchDetail matchId={params.id} />
}
