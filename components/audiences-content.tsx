'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, TrendingUp, MapPin, Heart } from 'lucide-react'

interface Audience {
  id: string
  name: string
  description?: string
  targeting_criteria?: Record<string, any>
  age_min?: number
  age_max?: number
  genders?: string[]
  locations?: string[]
  interests?: string[]
  behaviors?: string[]
  estimated_size: number
  status: 'active' | 'archived'
  created_at: string
  user_id: string
  organization_id: string
}

export function AudiencesContent() {
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    age_min: '',
    age_max: '',
    genders: '',
    locations: '',
    interests: '',
    behaviors: '',
    estimated_size: ''
  })

  useEffect(() => {
    fetchAudiences()
  }, [])

  const fetchAudiences = async () => {
    try {
      const response = await fetch('/api/audiences')
      if (response.ok) {
        const data = await response.json()
        setAudiences(data.audiences)
      }
    } catch (error) {
      console.error('Error fetching audiences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAudience = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          age_min: formData.age_min ? parseInt(formData.age_min) : undefined,
          age_max: formData.age_max ? parseInt(formData.age_max) : undefined,
          genders: formData.genders ? formData.genders.split(',').map(g => g.trim()) : [],
          locations: formData.locations ? formData.locations.split(',').map(l => l.trim()) : [],
          interests: formData.interests ? formData.interests.split(',').map(i => i.trim()) : [],
          behaviors: formData.behaviors ? formData.behaviors.split(',').map(b => b.trim()) : [],
          estimated_size: formData.estimated_size ? parseInt(formData.estimated_size) : 0
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAudiences([data.audience, ...audiences])
        setIsCreateDialogOpen(false)
        setFormData({
          name: '',
          description: '',
          age_min: '',
          age_max: '',
          genders: '',
          locations: '',
          interests: '',
          behaviors: '',
          estimated_size: ''
        })
      }
    } catch (error) {
      console.error('Error creating audience:', error)
    }
  }

  const getStatusBadge = (status: Audience['status']) => {
    const variants: Record<Audience['status'], string> = {
      active: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
      archived: 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
    }
    return <Badge className={variants[status]}>{status}</Badge>
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const totalAudienceSize = audiences.reduce((sum, a) => sum + a.estimated_size, 0)
  const activeAudiences = audiences.filter(a => a.status === 'active').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading audiences...</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audiences</h1>
          <p className="text-muted-foreground">Create and manage your target audiences</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Audience
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreateAudience}>
              <DialogHeader>
                <DialogTitle>Create New Audience</DialogTitle>
                <DialogDescription>
                  Define your target audience with demographic and behavioral criteria
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="name">Audience Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Young Urban Professionals"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="25-40 year olds living in major cities, interested in tech and fitness"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="age_min">Min Age</Label>
                    <Input
                      id="age_min"
                      type="number"
                      min="13"
                      max="100"
                      value={formData.age_min}
                      onChange={(e) => setFormData({ ...formData, age_min: e.target.value })}
                      placeholder="18"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="age_max">Max Age</Label>
                    <Input
                      id="age_max"
                      type="number"
                      min="13"
                      max="100"
                      value={formData.age_max}
                      onChange={(e) => setFormData({ ...formData, age_max: e.target.value })}
                      placeholder="65"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="genders">Genders (comma-separated)</Label>
                  <Input
                    id="genders"
                    value={formData.genders}
                    onChange={(e) => setFormData({ ...formData, genders: e.target.value })}
                    placeholder="Male, Female, Non-binary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="locations">Locations (comma-separated)</Label>
                  <Input
                    id="locations"
                    value={formData.locations}
                    onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                    placeholder="New York, Los Angeles, Chicago"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="interests">Interests (comma-separated)</Label>
                  <Input
                    id="interests"
                    value={formData.interests}
                    onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    placeholder="Technology, Fitness, Travel"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="behaviors">Behaviors (comma-separated)</Label>
                  <Input
                    id="behaviors"
                    value={formData.behaviors}
                    onChange={(e) => setFormData({ ...formData, behaviors: e.target.value })}
                    placeholder="Online shoppers, Frequent travelers"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="estimated_size">Estimated Audience Size</Label>
                  <Input
                    id="estimated_size"
                    type="number"
                    value={formData.estimated_size}
                    onChange={(e) => setFormData({ ...formData, estimated_size: e.target.value })}
                    placeholder="50000"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Audience</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Audiences</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAudiences}</div>
            <p className="text-xs text-muted-foreground">
              of {audiences.length} total audiences
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalAudienceSize)}</div>
            <p className="text-xs text-muted-foreground">
              estimated users across all audiences
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Size</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audiences.length > 0 ? formatNumber(Math.round(totalAudienceSize / audiences.length)) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              per audience
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Audiences Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Audiences</CardTitle>
          <CardDescription>
            {audiences.length === 0
              ? 'No audiences yet. Create your first audience to start targeting.'
              : `Showing ${audiences.length} audience${audiences.length !== 1 ? 's' : ''}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audiences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No audiences yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first audience to define who you want to reach
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Audience
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
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audiences.map((audience) => (
                  <TableRow key={audience.id}>
                    <TableCell className="font-medium">{audience.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {audience.description || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
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
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {audience.locations.slice(0, 2).join(', ')}
                            {audience.locations.length > 2 && ` +${audience.locations.length - 2} more`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(audience.estimated_size)}
                    </TableCell>
                    <TableCell>{getStatusBadge(audience.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(audience.created_at).toLocaleDateString()}
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
