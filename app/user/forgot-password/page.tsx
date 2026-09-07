'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, AlertCircle } from 'lucide-react'
import styles from './forgot-password.module.css'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartDrawer from '@/components/CartDrawer'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { language } = useLanguage()
  const t = translations[language]
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetData, setResetData] = useState({ email: '' })

  // Email validation states
  const [emailValidation, setEmailValidation] = useState({
    isValid: true,
    errors: [] as string[],
    showTooltip: false
  })

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/user/dashboard')
    }
  }, [isAuthenticated, user, router])

  // Email validation function
  const validateEmail = (email: string) => {
    const errors: string[] = []
    
    if (!email) {
      return { isValid: true, errors: [] }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const handleResetChange = (field: string, value: string) => {
    setResetData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'email') {
      const validation = validateEmail(value)
      setEmailValidation({ ...validation, showTooltip: false })
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!resetData.email) {
      setError('Please enter your email address')
      return
    }

    const emailValidation = validateEmail(resetData.email)
    if (!emailValidation.isValid) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetData.email })
      })

      const data = await response.json()

      if (!response.ok) {
        // Translate error messages
        let errorMessage = data.error || ('Error sending request')
        if (errorMessage === 'User not found' || errorMessage === 'Email not found') {
          errorMessage = 'User with this email address not found'
        } else if (errorMessage === 'Internal server error') {
          errorMessage = 'Internal server error. Please try again.'
        } else if (errorMessage.includes('Invalid') || errorMessage.includes('invalid')) {
          errorMessage = 'Invalid email address'
        }
        throw new Error(errorMessage)
      }

      setSuccess(data.message || t.passwordResetSent)
      setResetData({ email: '' })

    } catch (err: any) {
      // Translate error messages
      let errorMessage = err.message || ('Error sending request')
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
      <main className={styles.forgotPasswordPage}>
        <div className={styles.wrapper}>
        <span className={styles.rotateBg}></span>
        <span className={styles.rotateBg2}></span>

        <div className={styles.formBox}>
          <h2 className={styles.title}>
            {t.forgotPasswordTitle}
          </h2>

          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}
          
          <form onSubmit={handleForgotPassword}>
            <div className={styles.inputBox}>
              <input 
                type="email" 
                required 
                placeholder=" " 
                autoComplete="email"
                value={resetData.email}
                onChange={(e) => handleResetChange('email', e.target.value)}
                onFocus={() => setEmailValidation(prev => ({ ...prev, showTooltip: true }))}
                onBlur={() => setEmailValidation(prev => ({ ...prev, showTooltip: false }))}
                className={!emailValidation.isValid && resetData.email ? styles.invalidInput : ''}
              />
              <label>{t.email}</label>
              <Mail className={styles.inputIcon} size={18} />
              {!emailValidation.isValid && resetData.email && (
                <AlertCircle 
                  className={styles.validationIcon} 
                  size={18} 
                  onMouseEnter={() => setEmailValidation(prev => ({ ...prev, showTooltip: true }))}
                  onMouseLeave={() => setEmailValidation(prev => ({ ...prev, showTooltip: false }))}
                />
              )}
              {emailValidation.showTooltip && !emailValidation.isValid && emailValidation.errors.length > 0 && (
                <div className={styles.validationTooltip}>
                  <div className={styles.tooltipContent}>
                    {emailValidation.errors.map((error, index) => (
                      <div key={index} className={styles.tooltipError}>
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className={styles.btn}
              disabled={isLoading}
            >
              {isLoading ? ('Sending...') : t.sendResetLink}
            </button>

            <div className={styles.linkTxt}>
              <p>{t.alreadyHaveAccount} <a href="/user" className={styles.linkBtn}>{t.login}</a></p>
            </div>
          </form>
        </div>

        <div className={styles.infoText}>
          <h2>
            {t.resetPassword}
          </h2>
          <p>
            {t.forgotPasswordMessage}
          </p>
        </div>
      </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
