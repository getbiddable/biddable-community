'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Target, DollarSign, TrendingUp, Edit, Trash2, Plus, X, ImageIcon, FileText, Video, Users, MapPin, Heart } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Asset {
  id: string
  name: string
  type: string
  format?: string
  size?: string
  file_url?: string
  status: string
  ad_format?: string
  ad_data?: any
  created_at: string
}

interface CampaignAsset {
  id: number
  assigned_at: string
  asset_id: string
  assets: Asset
}

interface Audience {
  id: number
  name: string
  description?: string
  age_min?: number
  age_max?: number
  genders?: string[]
  locations?: string[]
  interests?: string[]
  behaviors?: string[]
  estimated_size: number
  status: string
  created_at: string
}

interface CampaignAudience {
  id: number
  assigned_at: string
  audience_id: number
  audiences: Audience
}

interface Campaign {
  id: number
  campaign_name: string
  created_at: string
  created_by: string
  platforms: string[]
  status: boolean
  budget: number
  start_date: string
  end_date: string
  goal?: string
  stripe_payment_intent_id?: string
  payment_status: string
  amount_collected: number
  amount_spent: number
  media_fee_charged: number
  subscription_plan: string
  payment_date?: string
}

interface CampaignDetailContentProps {
  campaignId: string
}

export function CampaignDetailContent({ campaignId }: CampaignDetailContentProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignedAssets, setAssignedAssets] = useState<CampaignAsset[]>([])
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([])
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assigningAssetId, setAssigningAssetId] = useState<string | null>(null)
  const [assignedAudiences, setAssignedAudiences] = useState<CampaignAudience[]>([])
  const [availableAudiences, setAvailableAudiences] = useState<Audience[]>([])
  const [isAssignAudienceDialogOpen, setIsAssignAudienceDialogOpen] = useState(false)
  const [assigningAudienceId, setAssigningAudienceId] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchCampaign()
    fetchAssignedAssets()
    fetchAvailableAssets()
    fetchAssignedAudiences()
    fetchAvailableAudiences()
  }, [campaignId])

  const fetchCampaign = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/campaigns/${campaignId}`)

      if (response.status === 404) {
        setError('Campaign not found or you do not have access to it')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch campaign')
      }

      const data = await response.json()
      setCampaign(data.campaign)
    } catch (err) {
      console.error('Error fetching campaign:', err)
      setError('Failed to load campaign details')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignedAssets = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/assets`)
      if (response.ok) {
        const data = await response.json()
        setAssignedAssets(data.assets || [])
      }
    } catch (err) {
      console.error('Error fetching assigned assets:', err)
    }
  }

  const fetchAvailableAssets = async () => {
    try {
      const response = await fetch('/api/assets')
      if (response.ok) {
        const data = await response.json()
        setAvailableAssets(data.assets || [])
      }
    } catch (err) {
      console.error('Error fetching available assets:', err)
    }
  }

  const handleAssignAsset = async (assetId: string) => {
    setAssigningAssetId(assetId)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId })
      })

      if (response.ok) {
        await fetchAssignedAssets()
        setIsAssignDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to assign asset')
      }
    } catch (err) {
      console.error('Error assigning asset:', err)
      alert('Failed to assign asset')
    } finally {
      setAssigningAssetId(null)
    }
  }

  const handleUnassignAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to unassign this asset from the campaign?')) {
      return
    }

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/assets?asset_id=${assetId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAssignedAssets()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to unassign asset')
      }
    } catch (err) {
      console.error('Error unassigning asset:', err)
      alert('Failed to unassign asset')
    }
  }

  const fetchAssignedAudiences = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/audiences`)
      if (response.ok) {
        const data = await response.json()
        setAssignedAudiences(data.audiences || [])
      }
    } catch (err) {
      console.error('Error fetching assigned audiences:', err)
    }
  }

  const fetchAvailableAudiences = async () => {
    try {
      const response = await fetch('/api/audiences')
      if (response.ok) {
        const data = await response.json()
        setAvailableAudiences(data.audiences || [])
      }
    } catch (err) {
      console.error('Error fetching available audiences:', err)
    }
  }

  const handleAssignAudience = async (audienceId: number) => {
    setAssigningAudienceId(audienceId)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/audiences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience_id: audienceId })
      })

      if (response.ok) {
        await fetchAssignedAudiences()
        setIsAssignAudienceDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to assign audience')
      }
    } catch (err) {
      console.error('Error assigning audience:', err)
      alert('Failed to assign audience')
    } finally {
      setAssigningAudienceId(null)
    }
  }

  const handleUnassignAudience = async (audienceId: number) => {
    if (!confirm('Are you sure you want to unassign this audience from the campaign?')) {
      return
    }

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/audiences?audience_id=${audienceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAssignedAudiences()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to unassign audience')
      }
    } catch (err) {
      console.error('Error unassigning audience:', err)
      alert('Failed to unassign audience')
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'text':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: boolean) => {
    if (status) {
      return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>
    }
    return <Badge className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">Inactive</Badge>
  }

  const getPlatformBadges = (platforms: string[]) => {
    const colors: Record<string, string> = {
      google: 'bg-blue-500/10 text-blue-500',
      facebook: 'bg-blue-600/10 text-blue-600',
      instagram: 'bg-pink-500/10 text-pink-500',
      linkedin: 'bg-blue-700/10 text-blue-700',
      tiktok: 'bg-black/10 text-white'
    }
    return (
      <div className="flex flex-wrap gap-2">
        {platforms.map((platform, idx) => (
          <Badge key={idx} className={`${colors[platform.toLowerCase()] || 'bg-gray-500/10 text-gray-500'} text-sm px-3 py-1`}>
            {platform}
          </Badge>
        ))}
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading campaign details...</p>
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-muted-foreground">{error || 'Campaign not found'}</p>
          <Link href="/campaigns">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const budgetRemaining = campaign.budget - campaign.amount_spent
  const budgetPercentUsed = (campaign.amount_spent / campaign.budget) * 100

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/campaigns">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{campaign.campaign_name}</h1>
            {getStatusBadge(campaign.status)}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Campaign ID: {campaign.id}</span>
            <span>•</span>
            <span>Created {formatDate(campaign.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" disabled>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(campaign.budget)}</div>
            <p className="text-xs text-muted-foreground">
              {budgetPercentUsed.toFixed(1)}% used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(campaign.amount_spent)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(budgetRemaining)} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(campaign.amount_collected)}</div>
            <p className="text-xs text-muted-foreground">
              Payment: {campaign.payment_status}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Fee</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(campaign.media_fee_charged)}</div>
            <p className="text-xs text-muted-foreground">
              Plan: {campaign.subscription_plan}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Information</CardTitle>
            <CardDescription>Key details about this campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Platforms</div>
              {getPlatformBadges(campaign.platforms)}
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Campaign Goal</div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>{campaign.goal || 'No goal specified'}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Campaign Duration</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
              {getStatusBadge(campaign.status)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>Billing and payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Payment Status</div>
              <Badge variant={campaign.payment_status === 'paid' ? 'default' : 'secondary'}>
                {campaign.payment_status}
              </Badge>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Subscription Plan</div>
              <span className="capitalize">{campaign.subscription_plan}</span>
            </div>

            {campaign.stripe_payment_intent_id && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Payment Intent ID</div>
                <code className="text-xs bg-muted px-2 py-1 rounded">{campaign.stripe_payment_intent_id}</code>
              </div>
            )}

            {campaign.payment_date && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Payment Date</div>
                <span>{formatDate(campaign.payment_date)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Usage</CardTitle>
          <CardDescription>Track spending against your budget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Spent: {formatCurrency(campaign.amount_spent)}</span>
              <span className="text-muted-foreground">Budget: {formatCurrency(campaign.budget)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  budgetPercentUsed >= 90
                    ? 'bg-red-500'
                    : budgetPercentUsed >= 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetPercentUsed, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{budgetPercentUsed.toFixed(1)}% used</span>
              <span className="text-muted-foreground">{formatCurrency(budgetRemaining)} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Assets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assigned Creative</CardTitle>
              <CardDescription>Assets assigned to this campaign</CardDescription>
            </div>
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Assign Creative to Campaign</DialogTitle>
                  <DialogDescription>
                    Select assets from your organization to assign to this campaign
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {availableAssets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No assets available. Create some assets in the Creative section first.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Preview</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableAssets.map((asset) => {
                          const isAssigned = assignedAssets.some(a => a.assets.id === asset.id)
                          return (
                            <TableRow key={asset.id}>
                              <TableCell>
                                {asset.type === 'image' && asset.file_url ? (
                                  <img src={asset.file_url} alt={asset.name} className="w-12 h-12 object-cover rounded" />
                                ) : (
                                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                    {getAssetIcon(asset.type)}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{asset.name}</TableCell>
                              <TableCell className="capitalize">{asset.type}</TableCell>
                              <TableCell>
                                {asset.type === 'text' && asset.ad_format ? (
                                  <Badge variant="outline">{asset.ad_format.toUpperCase()}</Badge>
                                ) : asset.format || '—'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={asset.status === 'approved' ? 'default' : 'secondary'}>
                                  {asset.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isAssigned ? (
                                  <Badge variant="outline" className="text-xs">Already Assigned</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAssignAsset(asset.id)}
                                    disabled={assigningAssetId === asset.id}
                                  >
                                    {assigningAssetId === asset.id ? 'Assigning...' : 'Assign'}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {assignedAssets.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assets assigned yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Assign creative assets to use in this campaign
              </p>
              <Button onClick={() => setIsAssignDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Assign Your First Asset
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedAssets.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {assignment.assets.type === 'image' && assignment.assets.file_url ? (
                        <img
                          src={assignment.assets.file_url}
                          alt={assignment.assets.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          {getAssetIcon(assignment.assets.type)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{assignment.assets.name}</TableCell>
                    <TableCell className="capitalize">{assignment.assets.type}</TableCell>
                    <TableCell>
                      {assignment.assets.type === 'text' && assignment.assets.ad_format ? (
                        <Badge variant="outline">{assignment.assets.ad_format.toUpperCase()}</Badge>
                      ) : assignment.assets.format || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={assignment.assets.status === 'approved' ? 'default' : 'secondary'}>
                        {assignment.assets.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnassignAsset(assignment.assets.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assigned Audiences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assigned Audiences</CardTitle>
              <CardDescription>Target audiences for this campaign</CardDescription>
            </div>
            <Dialog open={isAssignAudienceDialogOpen} onOpenChange={setIsAssignAudienceDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Audience
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Assign Audience to Campaign</DialogTitle>
                  <DialogDescription>
                    Select target audiences from your organization to assign to this campaign
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {availableAudiences.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No audiences available. Create some audiences in the Audiences section first.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Age Range</TableHead>
                          <TableHead>Locations</TableHead>
                          <TableHead>Interests</TableHead>
                          <TableHead>Estimated Size</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableAudiences.map((audience) => {
                          const isAssigned = assignedAudiences.some(a => a.audiences.id === audience.id)
                          return (
                            <TableRow key={audience.id}>
                              <TableCell className="font-medium">{audience.name}</TableCell>
                              <TableCell className="text-sm">
                                {audience.age_min && audience.age_max ? (
                                  `${audience.age_min}-${audience.age_max}`
                                ) : audience.age_min ? (
                                  `${audience.age_min}+`
                                ) : audience.age_max ? (
                                  `Up to ${audience.age_max}`
                                ) : (
                                  <span className="text-muted-foreground">All ages</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {audience.locations && audience.locations.length > 0 ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span>
                                      {audience.locations.slice(0, 2).join(', ')}
                                      {audience.locations.length > 2 && ` +${audience.locations.length - 2}`}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {audience.interests && audience.interests.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {audience.interests.slice(0, 2).map((interest, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {interest}
                                      </Badge>
                                    ))}
                                    {audience.interests.length > 2 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{audience.interests.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {formatNumber(audience.estimated_size)}
                              </TableCell>
                              <TableCell>
                                {isAssigned ? (
                                  <Badge variant="outline" className="text-xs">Already Assigned</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAssignAudience(audience.id)}
                                    disabled={assigningAudienceId === audience.id}
                                  >
                                    {assigningAudienceId === audience.id ? 'Assigning...' : 'Assign'}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {assignedAudiences.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No audiences assigned yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Assign target audiences to define who will see this campaign
              </p>
              <Button onClick={() => setIsAssignAudienceDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Assign Your First Audience
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Age Range</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Interests</TableHead>
                  <TableHead>Estimated Size</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedAudiences.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/audiences/${assignment.audiences.id}`}
                        className="text-primary hover:underline"
                      >
                        {assignment.audiences.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {assignment.audiences.description || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {assignment.audiences.age_min && assignment.audiences.age_max ? (
                        `${assignment.audiences.age_min}-${assignment.audiences.age_max}`
                      ) : assignment.audiences.age_min ? (
                        `${assignment.audiences.age_min}+`
                      ) : assignment.audiences.age_max ? (
                        `Up to ${assignment.audiences.age_max}`
                      ) : (
                        <span className="text-muted-foreground">All ages</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.audiences.locations && assignment.audiences.locations.length > 0 ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {assignment.audiences.locations.slice(0, 2).join(', ')}
                            {assignment.audiences.locations.length > 2 && ` +${assignment.audiences.locations.length - 2}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.audiences.interests && assignment.audiences.interests.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignment.audiences.interests.slice(0, 2).map((interest, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                          {assignment.audiences.interests.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{assignment.audiences.interests.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {formatNumber(assignment.audiences.estimated_size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnassignAudience(assignment.audiences.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
