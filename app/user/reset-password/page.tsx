'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import styles from './reset-password.module.css'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartDrawer from '@/components/CartDrawer'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuth()
  const { language } = useLanguage()
  const t = translations[language]
  const [isAdmin, setIsAdmin] = useState(false)
  
  const token = searchParams.get('token')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({ 
    password: '', 
    confirmPassword: '' 
  })

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/user/dashboard')
    }
  }, [isAuthenticated, user, router])

  // Check if token exists
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing token')
    }
  }, [token, language])

  const handlePasswordChange = (field: string, value: string) => {
    if (value.includes(' ')) {
      return
    }
    
    setPasswordData(prev => ({ ...prev, [field]: value }))
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setError('Invalid or missing token')
      return
    }

    if (!passwordData.password) {
      setError('Please enter a new password')
      return
    }

    if (passwordData.password.length < 8) {
      setError(t.passwordTooShort)
      return
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(passwordData.password)) {
      setError(t.passwordMustContain)
      return
    }

    if (passwordData.password !== passwordData.confirmPassword) {
      setError(t.passwordsDoNotMatch)
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          newPassword: passwordData.password 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Translate error messages
        let errorMessage = data.error || ('Error resetting password')
        if (errorMessage === 'Invalid or expired token' || errorMessage === 'Token not found' || errorMessage === 'Token expired') {
          errorMessage = 'Invalid or expired token. Please request a new password reset.'
        } else if (errorMessage === 'Internal server error') {
          errorMessage = 'Internal server error. Please try again.'
        } else if (errorMessage.includes('Invalid') || errorMessage.includes('invalid')) {
          errorMessage = 'Invalid data'
        }
        throw new Error(errorMessage)
      }

      setSuccess(t.passwordResetSuccess)
      
      setTimeout(() => {
        router.push('/user')
      }, 2000)

    } catch (err: any) {
      // Translate error messages
      let errorMessage = err.message || ('Error resetting password')
      if (errorMessage === 'Internal server error' || errorMessage.includes('fetch')) {
        errorMessage = 'An error occurred. Please try again.'
      }
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      <main className={styles.resetPasswordPage}>
        <div className={styles.wrapper}>
        <span className={styles.rotateBg}></span>
        <span className={styles.rotateBg2}></span>

        <div className={styles.formBox}>
          <h2 className={styles.title}>
            {t.resetPasswordTitle}
          </h2>

          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}
          
          <form onSubmit={handleResetPassword}>
            <div className={styles.inputBox}>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder=" " 
                autoComplete="new-password"
                value={passwordData.password}
                onChange={(e) => handlePasswordChange('password', e.target.value)}
              />
              <label>{t.newPassword}</label>
              <button
                type="button"
                className={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className={styles.inputBox}>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                required 
                placeholder=" " 
                autoComplete="new-password"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
              />
              <label>{t.confirmPassword}</label>
              <button
                type="button"
                className={styles.eyeIcon}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button 
              type="submit" 
              className={styles.btn}
              disabled={isLoading || !token}
            >
              {isLoading ? ('Resetting...') : t.resetPasswordButton}
            </button>

            <div className={styles.linkTxt}>
              <p>{'Remember your password?'} <a href="/user" className={styles.linkBtn}>{t.login}</a></p>
            </div>
          </form>
        </div>

        <div className={styles.infoText}>
          <h2>
            {t.resetPassword}
          </h2>
          <p>
            {t.resetPasswordMessage}
          </p>
        </div>
      </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
