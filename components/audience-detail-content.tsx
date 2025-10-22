'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Users, MapPin, Heart, TrendingUp, Edit, Save, X, Archive } from 'lucide-react'
import Link from 'next/link'

interface Audience {
  id: number
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
  updated_at: string
  user_id: string
  organization_id: string
}

interface AudienceDetailContentProps {
  audienceId: string
}

export function AudienceDetailContent({ audienceId }: AudienceDetailContentProps) {
  const [audience, setAudience] = useState<Audience | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Form data for editing
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
    fetchAudience()
  }, [audienceId])

  const fetchAudience = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/audiences/${audienceId}`)

      if (response.status === 404) {
        setError('Audience not found or you do not have access to it')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch audience')
      }

      const data = await response.json()
      setAudience(data.audience)

      // Populate form data
      setFormData({
        name: data.audience.name || '',
        description: data.audience.description || '',
        age_min: data.audience.age_min?.toString() || '',
        age_max: data.audience.age_max?.toString() || '',
        genders: data.audience.genders?.join(', ') || '',
        locations: data.audience.locations?.join(', ') || '',
        interests: data.audience.interests?.join(', ') || '',
        behaviors: data.audience.behaviors?.join(', ') || '',
        estimated_size: data.audience.estimated_size?.toString() || '0'
      })
    } catch (err) {
      console.error('Error fetching audience:', err)
      setError('Failed to load audience details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/audiences/${audienceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          age_min: formData.age_min ? parseInt(formData.age_min) : undefined,
          age_max: formData.age_max ? parseInt(formData.age_max) : undefined,
          genders: formData.genders ? formData.genders.split(',').map(g => g.trim()).filter(g => g) : [],
          locations: formData.locations ? formData.locations.split(',').map(l => l.trim()).filter(l => l) : [],
          interests: formData.interests ? formData.interests.split(',').map(i => i.trim()).filter(i => i) : [],
          behaviors: formData.behaviors ? formData.behaviors.split(',').map(b => b.trim()).filter(b => b) : [],
          estimated_size: formData.estimated_size ? parseInt(formData.estimated_size) : 0
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAudience(data.audience)
        setIsEditing(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update audience')
      }
    } catch (err) {
      console.error('Error updating audience:', err)
      alert('Failed to update audience')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to current audience values
    if (audience) {
      setFormData({
        name: audience.name || '',
        description: audience.description || '',
        age_min: audience.age_min?.toString() || '',
        age_max: audience.age_max?.toString() || '',
        genders: audience.genders?.join(', ') || '',
        locations: audience.locations?.join(', ') || '',
        interests: audience.interests?.join(', ') || '',
        behaviors: audience.behaviors?.join(', ') || '',
        estimated_size: audience.estimated_size?.toString() || '0'
      })
    }
    setIsEditing(false)
  }

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this audience? It will no longer be active.')) {
      return
    }

    try {
      const response = await fetch(`/api/audiences/${audienceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/audiences')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to archive audience')
      }
    } catch (err) {
      console.error('Error archiving audience:', err)
      alert('Failed to archive audience')
    }
  }

  const getStatusBadge = (status: 'active' | 'archived') => {
    if (status === 'active') {
      return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>
    }
    return <Badge className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">Archived</Badge>
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
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
          <p className="text-muted-foreground">Loading audience details...</p>
        </div>
      </div>
    )
  }

  if (error || !audience) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-muted-foreground">{error || 'Audience not found'}</p>
          <Link href="/audiences">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Audiences
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/audiences">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Audiences
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-3xl font-bold h-12"
                placeholder="Audience name"
              />
            ) : (
              <h1 className="text-3xl font-bold">{audience.name}</h1>
            )}
            {getStatusBadge(audience.status)}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Created {formatDate(audience.created_at)}</span>
            {audience.updated_at !== audience.created_at && (
              <>
                <span>•</span>
                <span>Updated {formatDate(audience.updated_at)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" onClick={handleArchive} disabled={audience.status === 'archived'}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(audience.estimated_size)}</div>
            <p className="text-xs text-muted-foreground">potential reach</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audience.locations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">targeted locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interests</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audience.interests?.length || 0}</div>
            <p className="text-xs text-muted-foreground">interest categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Audience Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core audience details and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              {isEditing ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this audience..."
                  rows={3}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1">{audience.description || <span className="text-muted-foreground">No description</span>}</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Estimated Size</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.estimated_size}
                  onChange={(e) => setFormData({ ...formData, estimated_size: e.target.value })}
                  placeholder="50000"
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-2xl font-bold">{formatNumber(audience.estimated_size)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
            <CardDescription>Age and gender targeting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Age Range</Label>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    type="number"
                    min="13"
                    max="100"
                    value={formData.age_min}
                    onChange={(e) => setFormData({ ...formData, age_min: e.target.value })}
                    placeholder="Min (18)"
                  />
                  <Input
                    type="number"
                    min="13"
                    max="100"
                    value={formData.age_max}
                    onChange={(e) => setFormData({ ...formData, age_max: e.target.value })}
                    placeholder="Max (65)"
                  />
                </div>
              ) : (
                <p className="mt-1">
                  {audience.age_min && audience.age_max ? (
                    `${audience.age_min}-${audience.age_max} years`
                  ) : audience.age_min ? (
                    `${audience.age_min}+ years`
                  ) : audience.age_max ? (
                    `Up to ${audience.age_max} years`
                  ) : (
                    <span className="text-muted-foreground">All ages</span>
                  )}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Genders</Label>
              {isEditing ? (
                <Input
                  value={formData.genders}
                  onChange={(e) => setFormData({ ...formData, genders: e.target.value })}
                  placeholder="Male, Female, Non-binary"
                  className="mt-1"
                />
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {audience.genders && audience.genders.length > 0 ? (
                    audience.genders.map((gender, idx) => (
                      <Badge key={idx} variant="secondary">{gender}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">All genders</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geographic Targeting</CardTitle>
            <CardDescription>Location-based targeting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Locations (comma-separated)</Label>
              {isEditing ? (
                <Textarea
                  value={formData.locations}
                  onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                  placeholder="New York, Los Angeles, Chicago"
                  rows={3}
                  className="mt-1"
                />
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {audience.locations && audience.locations.length > 0 ? (
                    audience.locations.map((location, idx) => (
                      <Badge key={idx} variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {location}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">All locations</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interest & Behavior Targeting</CardTitle>
            <CardDescription>Psychographic targeting criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Interests (comma-separated)</Label>
              {isEditing ? (
                <Textarea
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder="Technology, Fitness, Travel"
                  rows={2}
                  className="mt-1"
                />
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {audience.interests && audience.interests.length > 0 ? (
                    audience.interests.map((interest, idx) => (
                      <Badge key={idx} variant="secondary">{interest}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No interests specified</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Behaviors (comma-separated)</Label>
              {isEditing ? (
                <Textarea
                  value={formData.behaviors}
                  onChange={(e) => setFormData({ ...formData, behaviors: e.target.value })}
                  placeholder="Online shoppers, Frequent travelers"
                  rows={2}
                  className="mt-1"
                />
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {audience.behaviors && audience.behaviors.length > 0 ? (
                    audience.behaviors.map((behavior, idx) => (
                      <Badge key={idx} variant="secondary">{behavior}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No behaviors specified</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
