'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Target, DollarSign, TrendingUp, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

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
  const router = useRouter()

  useEffect(() => {
    fetchCampaign()
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
    </div>
  )
}
