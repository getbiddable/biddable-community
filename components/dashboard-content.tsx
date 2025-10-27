"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus,
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign,
  BarChart3,
  Edit,
  Trash2,
  Target,
  Calendar,
} from "lucide-react"
import { CampaignModal } from "./campaign-modal"

interface AdCampaign {
  id: string
  name: string
  status: "active" | "paused" | "draft"
  platform: string
  startDate: string
  endDate: string
  goal: "clicks" | "leads" | "views" | "sales"
  budget: number
  impressions: number
  clicks: number
  spend: number
  ctr: number
}

const mockCampaigns: AdCampaign[] = [
  {
    id: "1",
    name: "Summer Sale Campaign",
    status: "active",
    platform: "meta",
    startDate: "2024-06-01",
    endDate: "2024-08-31",
    goal: "sales",
    budget: 1500.0,
    impressions: 45230,
    clicks: 1205,
    spend: 892.5,
    ctr: 2.66,
  },
  {
    id: "2",
    name: "Brand Awareness Q4",
    status: "active",
    platform: "google-search",
    startDate: "2024-10-01",
    endDate: "2024-12-31",
    goal: "views",
    budget: 2000.0,
    impressions: 78450,
    clicks: 2340,
    spend: 1456.8,
    ctr: 2.98,
  },
  {
    id: "3",
    name: "Product Launch",
    status: "paused",
    platform: "youtube",
    startDate: "2024-03-15",
    endDate: "2024-05-15",
    goal: "clicks",
    budget: 500.0,
    impressions: 12890,
    clicks: 456,
    spend: 234.6,
    ctr: 3.54,
  },
]

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
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(mockCampaigns)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null)

  const handleCreateCampaign = () => {
    setEditingCampaign(null)
    setIsModalOpen(true)
  }

  const handleEditCampaign = (campaign: AdCampaign) => {
    setEditingCampaign(campaign)
    setIsModalOpen(true)
  }

  const handleSaveCampaign = (campaignData: AdCampaign) => {
    if (editingCampaign) {
      setCampaigns(campaigns.map((c) => (c.id === campaignData.id ? campaignData : c)))
    } else {
      setCampaigns([...campaigns, campaignData])
    }
  }

  const handleDeleteCampaign = (campaignId: string) => {
    setCampaigns(campaigns.filter((c) => c.id !== campaignId))
  }

  const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0)
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0)
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0)
  const avgCTR =
    campaigns.length > 0 ? campaigns.reduce((sum, campaign) => sum + campaign.ctr, 0) / campaigns.length : 0

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your ad campaigns directly</p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover text-white" onClick={handleCreateCampaign}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Campaign
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${totalSpend.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +15.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average CTR</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{avgCTR.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +0.4% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border border-border bg-background"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-3 h-3 ${
                      campaign.status === "active"
                        ? "bg-primary"
                        : campaign.status === "paused"
                          ? "bg-yellow-500"
                          : "bg-muted"
                    }`}
                  />
                  <div>
                    <h3 className="font-medium text-foreground">{campaign.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span className="capitalize">{campaign.status}</span>
                      <span>•</span>
                      <span>{platformNames[campaign.platform] || campaign.platform}</span>
                      <span>•</span>
                      <Target className="h-3 w-3 inline" />
                      <span>{goalNames[campaign.goal]}</span>
                      <span>•</span>
                      <Calendar className="h-3 w-3 inline" />
                      <span>
                        {new Date(campaign.startDate).toLocaleDateString()} -{" "}
                        {new Date(campaign.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <div className="flex space-x-8 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Impressions</p>
                      <p className="font-medium text-foreground">{campaign.impressions.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Clicks</p>
                      <p className="font-medium text-foreground">{campaign.clicks.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-medium text-foreground">${campaign.budget.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Spend</p>
                      <p className="font-medium text-foreground">${campaign.spend.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">CTR</p>
                      <p className="font-medium text-foreground">{campaign.ctr}%</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditCampaign(campaign)}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="border-border text-foreground hover:bg-muted hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <CampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCampaign}
        campaign={editingCampaign}
      />
    </div>
  )
}
