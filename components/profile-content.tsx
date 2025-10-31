"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { User, Mail, Building2, Shield, Key, Plus, Copy, Trash2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface UserProfile {
  email: string
  userId: string
  organizations: Array<{
    id: string
    name: string
    role: string
  }>
}

interface ApiKey {
  id: string
  name: string
  description?: string
  key_prefix: string
  permissions: Record<string, string[]>
  created_at: string
  last_used_at?: string
  expires_at?: string
  is_active: boolean
  created_by: string
}

export function ProfileContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyData, setNewKeyData] = useState<{ apiKey: string; name: string } | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [creating, setCreating] = useState(false)

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
    fetchApiKeys()
  }, [user])

  const fetchApiKeys = async () => {
    try {
      setLoadingKeys(true)
      const response = await fetch('/api/settings/api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      }
    } catch (error) {
      console.error('Error fetching API keys:', error)
    } finally {
      setLoadingKeys(false)
    }
  }

  const handleCreateKey = async () => {
    if (!formName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a name for the API key',
        variant: 'destructive',
      })
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewKeyData({
          apiKey: data.apiKey,
          name: data.name,
        })
        setFormName('')
        setFormDescription('')
        await fetchApiKeys()
        toast({
          title: 'Success',
          description: 'API key created successfully',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to create API key',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating API key:', error)
      toast({
        title: 'Error',
        description: 'Failed to create API key',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/settings/api-keys/${keyId}/revoke`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchApiKeys()
        toast({
          title: 'Success',
          description: 'API key revoked successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to revoke API key',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error revoking API key:', error)
      toast({
        title: 'Error',
        description: 'Failed to revoke API key',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/settings/api-keys/${keyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchApiKeys()
        setDeleteKeyId(null)
        toast({
          title: 'Success',
          description: 'API key deleted successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete API key',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete API key',
        variant: 'destructive',
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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

        {/* API Keys Card - Organization-wide */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Organization API Keys
                </CardTitle>
                <CardDescription>
                  API keys for agent access - shared across all members of your organization
                </CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>
                      Generate a new API key for agent access. This key will be shared across your organization.
                    </DialogDescription>
                  </DialogHeader>

                  {newKeyData ? (
                    /* Show the generated key - ONLY TIME IT'S VISIBLE */
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-green-500 mb-1">API Key Created!</h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              Copy this key now - you won't be able to see it again.
                            </p>
                            <div className="bg-background rounded border border-border p-3">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs font-medium">API Key</Label>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowKey(!showKey)}
                                >
                                  {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                              <code className="text-xs font-mono block break-all">
                                {showKey ? newKeyData.apiKey : '••••••••••••••••••••••••••••••••'}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-3"
                                onClick={() => copyToClipboard(newKeyData.apiKey)}
                              >
                                <Copy className="mr-2 h-3 w-3" />
                                Copy API Key
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            setNewKeyData(null)
                            setIsCreateDialogOpen(false)
                            setShowKey(false)
                          }}
                        >
                          Done
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    /* Create form */
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="key-name">Name *</Label>
                        <Input
                          id="key-name"
                          placeholder="Production Agent"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="key-description">Description</Label>
                        <Textarea
                          id="key-description"
                          placeholder="Used by Ai agents for campaign management"
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                          <p className="text-xs text-muted-foreground">
                            This key will be shared with all members of your organization and have full access to campaigns, assets, and audiences.
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateKey} disabled={creating}>
                          {creating ? 'Creating...' : 'Create API Key'}
                        </Button>
                      </DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingKeys ? (
              <div className="text-center py-8 text-muted-foreground">Loading API keys...</div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first API key to enable agent access for your organization
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create API Key
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <Building2 className="h-4 w-4 text-blue-500 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      These API keys are shared across your entire organization. Any member can view and manage them.
                    </p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{key.name}</div>
                            {key.description && (
                              <div className="text-sm text-muted-foreground">{key.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {key.key_prefix}
                          </code>
                        </TableCell>
                        <TableCell>
                          {key.is_active ? (
                            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Revoked</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(key.last_used_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {key.is_active && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRevokeKey(key.id)}
                              >
                                Revoke
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteKeyId(key.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any agents using this key will lose access immediately. This affects all members of your organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyId && handleDeleteKey(deleteKeyId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
