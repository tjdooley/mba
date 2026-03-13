import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TeamRosterEditor } from '@/components/TeamRosterEditor'

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      captain: { select: { id: true, displayName: true } },
      session: { select: { id: true, name: true, championTeamId: true } },
      roster: {
        include: { player: { select: { id: true, displayName: true } } },
        orderBy: { player: { lastName: 'asc' } },
      },
    },
  })

  if (!team) notFound()

  // Players not on any team in this session (available to add)
  const rosteredPlayerIds = await prisma.teamRoster.findMany({
    where: { team: { sessionId: team.session.id } },
    select: { playerId: true },
  }).then((rows) => rows.map((r) => r.playerId))

  const availablePlayers = await prisma.player.findMany({
    where: { id: { notIn: rosteredPlayerIds } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: { id: true, displayName: true, firstName: true, lastName: true },
  })

  const roster = team.roster.map((r) => ({
    playerId: r.player.id,
    displayName: r.player.displayName,
    isCaptain: r.player.id === team.captain.id,
  }))

  // Put captain first
  roster.sort((a, b) => (a.isCaptain ? -1 : b.isCaptain ? 1 : 0))

  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ marginBottom: 8 }}>
        <Link href={`/admin/teams?session=${team.session.id}`} style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
          ← Back to Teams
        </Link>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(24px, 4vw, 40px)',
          letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
        }}>
          {team.captain.displayName}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          {team.session.name} · {team.division === 'FREEHOUSE' ? 'FreeHouse' : "Delaney's"} · {team.wins}W–{team.losses}L
        </p>
      </div>

      <TeamRosterEditor
        teamId={team.id}
        sessionId={team.session.id}
        captainName={team.captain.displayName}
        division={team.division}
        roster={roster}
        availablePlayers={availablePlayers}
        isChampion={team.session.championTeamId === team.id}
      />
    </main>
  )
}
