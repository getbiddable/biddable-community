'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

interface AuditLog {
  id: number
  api_key_id: string
  organization_id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  request_method: string
  request_path: string
  request_body: any
  response_status: number
  response_body: any
  error_message: string | null
  ip_address: string
  user_agent: string
  duration_ms: number
  created_at: string
  api_key?: {
    name: string
    key_prefix: string
  }
}

export default function AgentLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('7d') // 1d, 7d, 30d, all
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  const supabase = createClient()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      // Build query
      let query = supabase
        .from('agent_audit_log')
        .select(`
          *,
          api_keys!inner(name, key_prefix)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      // Apply filters
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
      }

      if (statusFilter === 'success') {
        query = query.gte('response_status', 200).lt('response_status', 300)
      } else if (statusFilter === 'error') {
        query = query.gte('response_status', 400)
      }

      // Date range filter
      if (dateRange !== 'all') {
        const now = new Date()
        const daysAgo = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : 30
        const since = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        query = query.gte('created_at', since.toISOString())
      }

      // Search filter (request_id, resource_id, action)
      if (searchQuery) {
        query = query.or(
          `action.ilike.%${searchQuery}%,resource_id.ilike.%${searchQuery}%,resource_type.ilike.%${searchQuery}%`
        )
      }

      const { data, error, count } = await query

      if (error) throw error

      setLogs(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      logger.error('Error fetching audit logs', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter, statusFilter, dateRange, searchQuery])

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      )
    } else if (status >= 400 && status < 500) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <AlertCircle className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      )
    } else if (status >= 500) {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      )
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      POST: 'bg-green-500/10 text-green-500 border-green-500/20',
      PUT: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      PATCH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
    }
    return (
      <Badge variant="outline" className={colors[method] || ''}>
        {method}
      </Badge>
    )
  }

  const exportToCSV = () => {
    const headers = [
      'Timestamp',
      'API Key',
      'Action',
      'Method',
      'Resource Type',
      'Resource ID',
      'Status',
      'Duration (ms)',
      'IP Address',
    ]

    const rows = logs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.api_key?.name || 'Unknown',
      log.action,
      log.request_method,
      log.resource_type || '',
      log.resource_id || '',
      log.response_status,
      log.duration_ms,
      log.ip_address,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `agent-audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const getUniqueActions = () => {
    const actions = logs.map(log => log.action)
    return ['all', ...Array.from(new Set(actions))]
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Audit Logs</CardTitle>
          <CardDescription>
            View and filter all agent API actions for compliance and debugging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by action, resource type, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success (2xx)</SelectItem>
                <SelectItem value="error">Errors (4xx/5xx)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={fetchLogs} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button variant="outline" onClick={exportToCSV} title="Export to CSV">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{totalCount} total logs</span>
            <span>•</span>
            <span>
              {logs.filter(l => l.response_status >= 200 && l.response_status < 300).length} successful
            </span>
            <span>•</span>
            <span>
              {logs.filter(l => l.response_status >= 400).length} errors
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No audit logs found matching your filters
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        <TableCell>
                          {expandedRow === log.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <div className="font-medium">{log.api_key?.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">
                              {log.api_key?.key_prefix}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{log.action}</TableCell>
                        <TableCell>{getMethodBadge(log.request_method)}</TableCell>
                        <TableCell className="text-sm">
                          {log.resource_type ? (
                            <div>
                              <div className="font-medium capitalize">{log.resource_type}</div>
                              {log.resource_id && (
                                <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                                  {log.resource_id}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.response_status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.duration_ms}ms
                        </TableCell>
                      </TableRow>
                      {expandedRow === log.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30">
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Request Details</h4>
                                  <div className="space-y-1 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Path:</span>{' '}
                                      <span className="font-mono">{log.request_path}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">IP:</span> {log.ip_address}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">User Agent:</span>{' '}
                                      <span className="text-xs truncate block max-w-[300px]">
                                        {log.user_agent}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Response Details</h4>
                                  <div className="space-y-1 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Status:</span>{' '}
                                      {log.response_status}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Duration:</span>{' '}
                                      {log.duration_ms}ms
                                    </div>
                                    {log.error_message && (
                                      <div>
                                        <span className="text-muted-foreground">Error:</span>{' '}
                                        <span className="text-red-500">{log.error_message}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {log.request_body && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Request Body</h4>
                                  <pre className="text-xs bg-background border rounded p-3 overflow-x-auto max-h-[200px]">
                                    {JSON.stringify(log.request_body, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.response_body && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Response Body</h4>
                                  <pre className="text-xs bg-background border rounded p-3 overflow-x-auto max-h-[200px]">
                                    {JSON.stringify(log.response_body, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of{' '}
                {totalCount}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * pageSize >= totalCount}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
