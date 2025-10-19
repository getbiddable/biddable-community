"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, Target } from "lucide-react"

interface CampaignReport {
  id: string
  name: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
  period: string
}

const mockReports: CampaignReport[] = [
  {
    id: "1",
    name: "Summer Sale Campaign",
    impressions: 125430,
    clicks: 3205,
    spend: 1892.5,
    conversions: 156,
    ctr: 2.55,
    cpc: 0.59,
    roas: 4.2,
    period: "Last 30 days",
  },
  {
    id: "2",
    name: "Brand Awareness Q4",
    impressions: 98450,
    clicks: 2840,
    spend: 2156.8,
    conversions: 98,
    ctr: 2.88,
    cpc: 0.76,
    roas: 3.1,
    period: "Last 30 days",
  },
  {
    id: "3",
    name: "Product Launch",
    impressions: 67890,
    clicks: 1456,
    spend: 1234.6,
    conversions: 89,
    ctr: 2.14,
    cpc: 0.85,
    roas: 2.8,
    period: "Last 30 days",
  },
]

export function ReportingContent() {
  const [reports] = useState<CampaignReport[]>(mockReports)
  const [selectedPeriod, setSelectedPeriod] = useState("30days")
  const [selectedCampaign, setSelectedCampaign] = useState("all")

  const totalImpressions = reports.reduce((sum, report) => sum + report.impressions, 0)
  const totalClicks = reports.reduce((sum, report) => sum + report.clicks, 0)
  const totalSpend = reports.reduce((sum, report) => sum + report.spend, 0)
  const totalConversions = reports.reduce((sum, report) => sum + report.conversions, 0)
  const avgCTR = reports.length > 0 ? reports.reduce((sum, report) => sum + report.ctr, 0) / reports.length : 0
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
  const avgROAS = reports.length > 0 ? reports.reduce((sum, report) => sum + report.roas, 0) / reports.length : 0

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporting</h1>
          <p className="text-muted-foreground mt-1">Analyze your campaign performance</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40 bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48 bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {reports.map((report) => (
                <SelectItem key={report.id} value={report.id}>
                  {report.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="bg-primary hover:bg-primary-hover text-white">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-primary flex items-center">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +18.2% vs previous period
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
            <p className="text-xs text-primary flex items-center">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12.5% vs previous period
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
            <p className="text-xs text-red-500 flex items-center">
              <TrendingDown className="inline h-3 w-3 mr-1" />
              -5.3% vs previous period
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalConversions.toLocaleString()}</div>
            <p className="text-xs text-primary flex items-center">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +24.1% vs previous period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Click-Through Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-2">{avgCTR.toFixed(2)}%</div>
            <div className="w-full bg-muted h-2">
              <div className="bg-primary h-2" style={{ width: `${Math.min(avgCTR * 20, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Industry average: 2.1%</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Cost Per Click</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-2">${avgCPC.toFixed(2)}</div>
            <div className="w-full bg-muted h-2">
              <div className="bg-secondary h-2" style={{ width: `${Math.min(avgCPC * 50, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Industry average: $0.85</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Return on Ad Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-2">{avgROAS.toFixed(1)}x</div>
            <div className="w-full bg-muted h-2">
              <div className="bg-primary h-2" style={{ width: `${Math.min(avgROAS * 20, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Target ROAS: 4.0x</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Campaign</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Impressions</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Clicks</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">CTR</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">CPC</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Spend</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Conversions</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-foreground">{report.name}</div>
                      <div className="text-sm text-muted-foreground">{report.period}</div>
                    </td>
                    <td className="text-right py-4 px-4 text-foreground">{report.impressions.toLocaleString()}</td>
                    <td className="text-right py-4 px-4 text-foreground">{report.clicks.toLocaleString()}</td>
                    <td className="text-right py-4 px-4 text-foreground">{report.ctr.toFixed(2)}%</td>
                    <td className="text-right py-4 px-4 text-foreground">${report.cpc.toFixed(2)}</td>
                    <td className="text-right py-4 px-4 text-foreground">${report.spend.toFixed(2)}</td>
                    <td className="text-right py-4 px-4 text-foreground">{report.conversions}</td>
                    <td className="text-right py-4 px-4">
                      <span
                        className={`font-medium ${
                          report.roas >= 4 ? "text-primary" : report.roas >= 3 ? "text-yellow-500" : "text-red-500"
                        }`}
                      >
                        {report.roas.toFixed(1)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
