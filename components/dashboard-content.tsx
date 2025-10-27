"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Plus,
  TrendingUp,
  DollarSign,
  BarChart3,
  Target,
  Calendar,
} from "lucide-react"
import Link from "next/link"

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

const platformNames: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  "google-search": "Google Search",
  youtube: "YouTube",
  reddit: "Reddit",
}

const goalNames: Record<string, string> = {
  clicks: "Clicks",
  leads: "Leads",
  views: "Views",
  sales: "Sales",
}

export function DashboardContent() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    platforms: [] as string[],
    goal: '',
    budget: '',
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns)
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.platforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          platforms: formData.platforms,
          goal: formData.goal || null,
          budget: formData.budget,
          start_date: formData.start_date,
          end_date: formData.end_date
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCampaigns([data.campaign, ...campaigns])
        setIsCreateDialogOpen(false)
        setFormData({
          name: '',
          platforms: [],
          goal: '',
          budget: '',
          start_date: '',
          end_date: ''
        })
      } else {
        const errorData = await response.json()
        console.error('Error creating campaign:', errorData.error)
        alert(`Error: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Failed to create campaign')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0)
  const totalSpent = campaigns.reduce((sum, c) => sum + c.amount_spent, 0)
  const totalCollected = campaigns.reduce((sum, c) => sum + c.amount_collected, 0)
  const activeCampaigns = campaigns.filter(c => c.status === true).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your ad campaigns directly</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreateCampaign}>
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new advertising campaign
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Summer Sale 2024"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Platforms (select at least one)</Label>
                  <div className="space-y-2">
                    {['Google', 'YouTube', 'Reddit', 'Meta'].map((platform) => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Checkbox
                          id={platform}
                          checked={formData.platforms.includes(platform)}
                          onCheckedChange={() => togglePlatform(platform)}
                        />
                        <label
                          htmlFor={platform}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {platform}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="goal">Campaign Goal (optional)</Label>
                  <Select
                    value={formData.goal}
                    onValueChange={(value) => setFormData({ ...formData, goal: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clicks">Clicks</SelectItem>
                      <SelectItem value="views">Views</SelectItem>
                      <SelectItem value="leads">Leads</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="1000"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Campaign</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              of {campaigns.length} total campaigns
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${totalBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${totalSpent.toLocaleString()} spent
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              from {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              campaigns in your account
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first campaign to start advertising
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.slice(0, 5).map((campaign) => (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <div className="flex items-center justify-between p-4 border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          campaign.status
                            ? "bg-green-500"
                            : "bg-gray-500"
                        }`}
                      />
                      <div>
                        <h3 className="font-medium text-foreground">{campaign.campaign_name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{campaign.status ? 'Active' : 'Inactive'}</span>
                          <span>•</span>
                          <span>{campaign.platforms.join(', ')}</span>
                          {campaign.goal && (
                            <>
                              <span>•</span>
                              <Target className="h-3 w-3 inline" />
                              <span>{goalNames[campaign.goal] || campaign.goal}</span>
                            </>
                          )}
                          <span>•</span>
                          <Calendar className="h-3 w-3 inline" />
                          <span>
                            {new Date(campaign.start_date).toLocaleDateString()} -{" "}
                            {new Date(campaign.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-8">
                      <div className="flex space-x-6 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">Budget</p>
                          <p className="font-medium text-foreground">{formatCurrency(campaign.budget)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Spent</p>
                          <p className="font-medium text-foreground">{formatCurrency(campaign.amount_spent)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Collected</p>
                          <p className="font-medium text-foreground">{formatCurrency(campaign.amount_collected)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
