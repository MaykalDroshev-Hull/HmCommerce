'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { translations } from '@/lib/translations'
import { X, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

interface QuickLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: () => void
  productId?: string
}

export default function QuickLoginModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess,
  productId 
}: QuickLoginModalProps) {
  const { login } = useAuth()
  const { language } = useLanguage()
  const { theme } = useTheme()
  const t = translations[language]
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const retryMinutes = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 15
        setError(`Too many attempts. Please wait ${retryMinutes} minutes.`)
        return
      }

      if (!response.ok) {
        let errorMessage = data.error || t.invalidCredentials
        if (errorMessage === 'Invalid email or password' || errorMessage === 'Invalid email or password format') {
          errorMessage = t.invalidCredentials
        }
        setError(errorMessage)
        return
      }

      // Login user with context
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone || '',
        locationText: data.user.locationText || '',
        locationCoordinates: data.user.locationCoordinates || '',
        addressInstructions: data.user.addressInstructions || '',
        created_at: data.user.created_at,
        preferredDeliveryType: data.user.preferredDeliveryType || undefined,
        preferredEcontOfficeId: data.user.preferredEcontOfficeId || undefined,
        preferredCity: data.user.preferredCity || undefined,
        preferredStreet: data.user.preferredStreet || undefined,
        preferredStreetNumber: data.user.preferredStreetNumber || undefined,
        preferredEntrance: data.user.preferredEntrance || undefined,
        preferredFloor: data.user.preferredFloor || undefined,
        preferredApartment: data.user.preferredApartment || undefined
      })

      // If productId is provided, add it to favorites after login
      if (productId) {
        try {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              productId: productId
            })
          })
        } catch {
          // Favorite add is best-effort after login
        }
      }

      // Close modal and call success callback
      onClose()
      if (onLoginSuccess) {
        onLoginSuccess()
      } else {
        // Reload page to refresh favorite status
        window.location.reload()
      }

    } catch (err: any) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-lg p-6 shadow-lg"
        style={{ 
          backgroundColor: theme.colors.cardBg,
          border: `1px solid ${theme.colors.border}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:opacity-80 transition-opacity"
          style={{ color: theme.colors.textSecondary }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ color: theme.colors.text }}
        >
          {t.loginTitle || 'Login'}
        </h2>
        <p 
          className="text-sm mb-6"
          style={{ color: theme.colors.textSecondary }}
        >
          {t.pleaseLoginToFavorite}
        </p>

        {/* Error message */}
        {error && (
          <div 
            className="mb-4 p-3 rounded-lg flex items-start gap-2"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444'
            }}
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: theme.colors.text }}
            >
              {t.email}
            </label>
            <div className="relative">
              <Mail 
                className="absolute left-3 top-1/2 -translate-y-1/2"
                size={18}
                style={{ color: theme.colors.textSecondary }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:outline-none transition-colors"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
                placeholder="Email address"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label 
              className="block text-sm font-medium mb-1.5"
              style={{ color: theme.colors.text }}
            >
              {t.password}
            </label>
            <div className="relative">
              <Lock 
                className="absolute left-3 top-1/2 -translate-y-1/2"
                size={18}
                style={{ color: theme.colors.textSecondary }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border focus:ring-2 focus:outline-none transition-colors"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
                placeholder="Password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: theme.colors.textSecondary }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#ffffff'
            }}
          >
            {isLoading 
              ? 'Logging in...'
              : (t.loginButton || 'Login')
            }
          </button>
        </form>

        {/* Link to full login page */}
        <div className="mt-4 text-center">
          <a
            href="/user"
            className="text-sm underline hover:opacity-80 transition-opacity"
            style={{ color: theme.colors.primary }}
          >
            Don&apos;t have an account? Register
          </a>
        </div>
      </div>
    </div>
  )
}
