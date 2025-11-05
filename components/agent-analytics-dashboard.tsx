'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  DollarSign,
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { Button } from '@/components/ui/button'

interface AnalyticsData {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  avgResponseTime: number
  requestsByDay: { date: string; count: number }[]
  topActions: { action: string; count: number; avg_duration: number }[]
  topApiKeys: { name: string; count: number; success_rate: number }[]
  errorsByEndpoint: { action: string; error_count: number; total_count: number }[]
  recentErrors: {
    action: string
    error_message: string
    created_at: string
    request_path: string
  }[]
}

export default function AgentAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d') // 1d, 7d, 30d, all

  const supabase = createClient()

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Calculate date range
      const now = new Date()
      let since: Date | null = null
      if (timeRange === '1d') since = subDays(now, 1)
      else if (timeRange === '7d') since = subDays(now, 7)
      else if (timeRange === '30d') since = subDays(now, 30)

      // Fetch all logs for the time range
      let query = supabase
        .from('agent_audit_log')
        .select(`
          *,
          api_keys!inner(name, key_prefix)
        `)
        .order('created_at', { ascending: false })

      if (since) {
        query = query.gte('created_at', since.toISOString())
      }

      const { data: logs, error } = await query

      if (error) throw error

      // Calculate metrics
      const totalRequests = logs?.length || 0
      const successfulRequests =
        logs?.filter((l) => l.response_status >= 200 && l.response_status < 300).length || 0
      const failedRequests = totalRequests - successfulRequests

      const avgResponseTime =
        logs && logs.length > 0
          ? logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / logs.length
          : 0

      // Requests by day
      const requestsByDay: Record<string, number> = {}
      logs?.forEach((log) => {
        const date = format(new Date(log.created_at), 'yyyy-MM-dd')
        requestsByDay[date] = (requestsByDay[date] || 0) + 1
      })

      const requestsByDayArray = Object.entries(requestsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Top actions
      const actionStats: Record<
        string,
        { count: number; total_duration: number }
      > = {}
      logs?.forEach((log) => {
        if (!actionStats[log.action]) {
          actionStats[log.action] = { count: 0, total_duration: 0 }
        }
        actionStats[log.action].count++
        actionStats[log.action].total_duration += log.duration_ms || 0
      })

      const topActions = Object.entries(actionStats)
        .map(([action, stats]) => ({
          action,
          count: stats.count,
          avg_duration: Math.round(stats.total_duration / stats.count),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Top API keys
      const apiKeyStats: Record<
        string,
        { count: number; successful: number; name: string }
      > = {}
      logs?.forEach((log) => {
        const keyId = log.api_key_id
        if (!apiKeyStats[keyId]) {
          apiKeyStats[keyId] = {
            count: 0,
            successful: 0,
            name: log.api_keys?.name || 'Unknown',
          }
        }
        apiKeyStats[keyId].count++
        if (log.response_status >= 200 && log.response_status < 300) {
          apiKeyStats[keyId].successful++
        }
      })

      const topApiKeys = Object.values(apiKeyStats)
        .map((stats) => ({
          name: stats.name,
          count: stats.count,
          success_rate: (stats.successful / stats.count) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Errors by endpoint
      const errorStats: Record<string, { error_count: number; total_count: number }> = {}
      logs?.forEach((log) => {
        if (!errorStats[log.action]) {
          errorStats[log.action] = { error_count: 0, total_count: 0 }
        }
        errorStats[log.action].total_count++
        if (log.response_status >= 400) {
          errorStats[log.action].error_count++
        }
      })

      const errorsByEndpoint = Object.entries(errorStats)
        .map(([action, stats]) => ({
          action,
          error_count: stats.error_count,
          total_count: stats.total_count,
        }))
        .filter((e) => e.error_count > 0)
        .sort((a, b) => b.error_count - a.error_count)
        .slice(0, 5)

      // Recent errors
      const recentErrors = logs
        ?.filter((l) => l.response_status >= 400)
        .slice(0, 10)
        .map((l) => ({
          action: l.action,
          error_message: l.error_message || `HTTP ${l.response_status}`,
          created_at: l.created_at,
          request_path: l.request_path,
        }))

      setAnalytics({
        totalRequests,
        successfulRequests,
        failedRequests,
        avgResponseTime,
        requestsByDay: requestsByDayArray,
        topActions,
        topApiKeys,
        errorsByEndpoint,
        recentErrors: recentErrors || [],
      })
    } catch (error) {
      logger.error('Error fetching analytics', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No analytics data available
          </CardContent>
        </Card>
      </div>
    )
  }

  const successRate = analytics.totalRequests > 0
    ? (analytics.successfulRequests / analytics.totalRequests) * 100
    : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Analytics</h1>
          <p className="text-muted-foreground">
            Performance insights and usage statistics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.successfulRequests} successful, {analytics.failedRequests} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.avgResponseTime)}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.avgResponseTime < 500 ? 'Excellent' : 'Good'} performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analytics.failedRequests / analytics.totalRequests) * 100 || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.failedRequests} failed requests
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Most Used Endpoints</CardTitle>
            <CardDescription>Top 10 actions by request count</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topActions.map((action) => (
                  <TableRow key={action.action}>
                    <TableCell className="font-mono text-sm">{action.action}</TableCell>
                    <TableCell className="text-right">{action.count}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {action.avg_duration}ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top API Keys */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active API Keys</CardTitle>
            <CardDescription>Top 5 API keys by request volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topApiKeys.map((apiKey) => (
                <div key={apiKey.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{apiKey.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{apiKey.count} requests</span>
                      <Badge
                        variant="outline"
                        className={
                          apiKey.success_rate >= 95
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : apiKey.success_rate >= 80
                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }
                      >
                        {apiKey.success_rate.toFixed(1)}% success
                      </Badge>
                    </div>
                  </div>
                  <Progress value={apiKey.success_rate} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Errors by Endpoint */}
        <Card>
          <CardHeader>
            <CardTitle>Error Hotspots</CardTitle>
            <CardDescription>Endpoints with highest error rates</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Error Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.errorsByEndpoint.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      No errors found!
                    </TableCell>
                  </TableRow>
                ) : (
                  analytics.errorsByEndpoint.map((endpoint) => (
                    <TableRow key={endpoint.action}>
                      <TableCell className="font-mono text-sm">{endpoint.action}</TableCell>
                      <TableCell className="text-right">{endpoint.error_count}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                          {((endpoint.error_count / endpoint.total_count) * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>Latest failed requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentErrors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  No recent errors!
                </div>
              ) : (
                analytics.recentErrors.map((error, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{error.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(error.created_at), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                    <div className="text-xs text-red-500">{error.error_message}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {error.request_path}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Request Volume Over Time</CardTitle>
          <CardDescription>Daily request counts</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.requestsByDay.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No request data available
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.requestsByDay.map((day) => (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground w-24">
                    {format(new Date(day.date), 'MMM dd')}
                  </div>
                  <div className="flex-1">
                    <Progress value={(day.count / Math.max(...analytics.requestsByDay.map(d => d.count))) * 100} />
                  </div>
                  <div className="text-sm font-medium w-16 text-right">{day.count}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
