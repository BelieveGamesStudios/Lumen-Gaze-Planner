"use client"

import { useState } from "react"
import type { Profile, Team, TeamInvitation } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Mail, Check, X } from "lucide-react"
import { CreateTeamDialog } from "./create-team-dialog"
import { TeamDetailsDialog } from "./team-details-dialog"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface TeamsClientProps {
  userId: string
  userEmail: string
  userProfile: Profile | null
  initialTeams: (Team & { team_members: { id: string; user_id: string; role: string }[] })[]
  initialPendingInvitations: (TeamInvitation & {
    team: { name: string; description: string | null }
    invited_by: { display_name: string | null }
  })[]
}

export function TeamsClient({
  userId,
  userEmail,
  userProfile,
  initialTeams,
  initialPendingInvitations,
}: TeamsClientProps) {
  const [teams, setTeams] = useState(initialTeams)
  const [pendingInvitations, setPendingInvitations] = useState(initialPendingInvitations)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const invitation = pendingInvitations.find((i) => i.id === invitationId)
      if (!invitation) return

      // Add user to team
      await supabase.from("team_members").insert({
        team_id: invitation.team_id,
        user_id: userId,
        role: invitation.role,
      })

      // Update invitation status
      await supabase.from("team_invitations").update({ status: "accepted" }).eq("id", invitationId)

      // Remove from pending
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId))

      // Refresh teams
      router.refresh()
    } catch (error) {
      console.error("Failed to accept invitation:", error)
    }
  }

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await supabase.from("team_invitations").update({ status: "rejected" }).eq("id", invitationId)
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId))
    } catch (error) {
      console.error("Failed to reject invitation:", error)
    }
  }

  const isTeamOwner = (team: Team) => team.owner_id === userId
  const isTeamMember = (team: Team) => teams.find((t) => t.id === team.id)

  const handleTeamCreated = (newTeam: any) => {
    setTeams((prev) => [newTeam, ...prev])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground mt-1">Create and manage team planners for collaborative planning</p>
        </div>
        <CreateTeamDialog userId={userId} onTeamCreated={handleTeamCreated} />
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-lg border bg-background p-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{invitation.team.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Invited by {invitation.invited_by.display_name || "a team member"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Role: <Badge variant="outline">{invitation.role}</Badge>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRejectInvitation(invitation.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Teams Grid */}
      {teams.length === 0 && pendingInvitations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No teams yet</h3>
            <p className="text-muted-foreground text-center mt-1">Create a team to start collaborating with others</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              onClick={() => setSelectedTeam(team.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{team.name}</CardTitle>
                    {team.description && <CardDescription className="mt-2">{team.description}</CardDescription>}
                  </div>
                  {isTeamOwner(team) && <Badge variant="default">Owner</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {team.team_members.length} member{team.team_members.length !== 1 ? "s" : ""}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsDialog
          teamId={selectedTeam}
          userId={userId}
          isOwner={teams.find((t) => t.id === selectedTeam)?.owner_id === userId}
          onClose={() => setSelectedTeam(null)}
          onUpdated={() => {
            router.refresh()
            setSelectedTeam(null)
          }}
        />
      )}
    </div>
  )
}
