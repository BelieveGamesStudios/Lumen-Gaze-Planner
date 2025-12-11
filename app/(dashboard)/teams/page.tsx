import { createClient } from "@/lib/supabase/server"
import { TeamsClient } from "@/components/teams/teams-client"

export default async function TeamsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch user's profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Fetch teams where user is owner or member
  const { data: teams, error } = await supabase
    .from("teams")
    .select(`
      *,
      team_members(id, user_id, role)
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching teams:", error)
  }

  // Fetch pending invitations
  const { data: pendingInvitations } = await supabase
    .from("team_invitations")
    .select(`
      *,
      team:teams(name, description),
      invited_by:profiles(display_name)
    `)
    .eq("invited_email", user.email)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())

  return (
    <TeamsClient
      userId={user.id}
      userEmail={user.email || ""}
      userProfile={profile}
      initialTeams={teams || []}
      initialPendingInvitations={pendingInvitations || []}
    />
  )
}
