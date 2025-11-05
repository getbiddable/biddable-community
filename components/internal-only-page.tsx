'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { checkIsInternalEmployee } from '@/lib/auth-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InternalOnlyPageProps {
  children: React.ReactNode
  title?: string
  description?: string
}

/**
 * Wrapper component for internal-only pages
 * Shows content only if user is an internal employee
 */
export default function InternalOnlyPage({
  children,
  title = 'Internal Access Only',
  description = 'This page is only accessible to internal employees'
}: InternalOnlyPageProps) {
  const [isInternal, setIsInternal] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const hasAccess = await checkIsInternalEmployee()
        setIsInternal(hasAccess)
      } catch (error) {
        console.error('Error checking access:', error)
        setIsInternal(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Checking access...</div>
      </div>
    )
  }

  if (isInternal === false) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-yellow-500" />
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-yellow-500/5 border-yellow-500/20">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Access Restricted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This page is only accessible to internal employees with a verified email address.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/')} className="flex-1">
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.back()} className="flex-1">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
