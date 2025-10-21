"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Building2, Shield } from "lucide-react"
import { useEffect, useState } from "react"

interface UserProfile {
  email: string
  userId: string
  organizations: Array<{
    id: string
    name: string
    role: string
  }>
}

export function ProfileContent() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return

      try {
        const response = await fetch("/api/profile")
        if (response.ok) {
          const data = await response.json()
          setProfile(data)
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your account information</p>
      </div>

      <div className="space-y-6">
        {/* User Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="text-base font-mono text-sm">{user.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organizations
            </CardTitle>
            <CardDescription>Organizations you belong to</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading organizations...</p>
            ) : profile?.organizations && profile.organizations.length > 0 ? (
              <div className="space-y-3">
                {profile.organizations.map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground">ID: {org.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium capitalize">{org.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">You are not a member of any organizations</p>
                <p className="text-sm text-muted-foreground mt-1">Contact an administrator to be added to an organization</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Status
            </CardTitle>
            <CardDescription>Your account status and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-base">Active</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Created</p>
                <p className="text-base">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
