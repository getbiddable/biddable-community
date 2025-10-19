"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DateSelector } from "./date-selector"

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

interface CampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (campaign: AdCampaign) => void
  campaign?: AdCampaign | null
}

const platformOptions = [
  { value: "meta", label: "Meta (Facebook & Instagram)" },
  { value: "google-search", label: "Google Search" },
  { value: "youtube", label: "YouTube" },
  { value: "display", label: "Internet Display" },
  { value: "reddit", label: "Reddit" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
]

const goalOptions = [
  { value: "clicks", label: "Clicks" },
  { value: "leads", label: "Leads" },
  { value: "views", label: "Views" },
  { value: "sales", label: "Sales" },
]

export function CampaignModal({ isOpen, onClose, onSave, campaign }: CampaignModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    status: "draft" as "active" | "paused" | "draft",
    platform: "",
    startDate: "",
    endDate: "",
    goal: "clicks" as "clicks" | "leads" | "views" | "sales",
    budget: 0,
  })

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        status: campaign.status,
        platform: campaign.platform,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        goal: campaign.goal,
        budget: campaign.budget,
      })
    } else {
      setFormData({
        name: "",
        status: "draft",
        platform: "",
        startDate: "",
        endDate: "",
        goal: "clicks",
        budget: 0,
      })
    }
  }, [campaign, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const campaignData: AdCampaign = {
      id: campaign?.id || Date.now().toString(),
      name: formData.name,
      status: formData.status,
      platform: formData.platform,
      startDate: formData.startDate,
      endDate: formData.endDate,
      goal: formData.goal,
      budget: formData.budget,
      impressions: campaign?.impressions || 0,
      clicks: campaign?.clicks || 0,
      spend: campaign?.spend || 0,
      ctr: campaign?.ctr || 0,
    }

    onSave(campaignData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">{campaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Campaign Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter campaign name"
                required
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform" className="text-foreground">
                Platform
              </Label>
              <Select
                value={formData.platform}
                onValueChange={(value: string) => setFormData({ ...formData, platform: value })}
                required
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {platformOptions.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value} className="text-foreground">
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateSelector
              label="Start Date"
              value={formData.startDate}
              onChange={(date) => setFormData({ ...formData, startDate: date })}
              placeholder="Select start date"
              required
              minDate={new Date().toISOString().split("T")[0]} // Prevent past dates
              maxDate={formData.endDate || undefined} // Prevent start date after end date
            />

            <DateSelector
              label="End Date"
              value={formData.endDate}
              onChange={(date) => setFormData({ ...formData, endDate: date })}
              placeholder="Select end date"
              required
              minDate={formData.startDate || new Date().toISOString().split("T")[0]} // Prevent end date before start date
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal" className="text-foreground">
                Campaign Goal
              </Label>
              <Select
                value={formData.goal}
                onValueChange={(value: "clicks" | "leads" | "views" | "sales") =>
                  setFormData({ ...formData, goal: value })
                }
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {goalOptions.map((goal) => (
                    <SelectItem key={goal.value} value={goal.value} className="text-foreground">
                      {goal.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget" className="text-foreground">
                Budget ($)
              </Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: Number.parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-foreground">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "paused" | "draft") => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="draft" className="text-foreground">
                    Draft
                  </SelectItem>
                  <SelectItem value="active" className="text-foreground">
                    Active
                  </SelectItem>
                  <SelectItem value="paused" className="text-foreground">
                    Paused
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-foreground hover:bg-muted bg-transparent"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary-hover text-white">
              {campaign ? "Update Campaign" : "Create Campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
