'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react'
import styles from './user.module.css'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartDrawer from '@/components/CartDrawer'

export default function UserPage() {
  const router = useRouter()
  const { login, user, isAuthenticated } = useAuth()
  const { language } = useLanguage()
  const t = translations[language]
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [success, setSuccess] = useState('')
  const [returnUrl, setReturnUrl] = useState<string | null>(null)

  // Get return URL from query parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const returnUrlParam = urlParams.get('returnUrl')
      if (returnUrlParam) {
        setReturnUrl(decodeURIComponent(returnUrlParam))
      }
    }
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (returnUrl) {
        router.push(returnUrl)
      } else {
        router.push('/user/dashboard')
      }
    }
  }, [isAuthenticated, user, returnUrl, router])

  // Form state
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registerData, setRegisterData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    password: '' 
  })

  // Email validation states
  const [emailValidation, setEmailValidation] = useState({
    isValid: true,
    errors: [] as string[],
    showTooltip: false
  })

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

  const toggleForm = () => {
    setIsLogin(!isLogin)
    setLoginError('')
    setRegisterError('')
    setSuccess('')
    setEmailValidation({ isValid: true, errors: [], showTooltip: false })
  }

  const handleLoginChange = (field: string, value: string) => {
    if (field === 'password' && value.includes(' ')) {
      return
    }
    
    setLoginData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'email') {
      const validation = validateEmail(value)
      setEmailValidation({ ...validation, showTooltip: false })
    }
  }

  const handleRegisterChange = (field: string, value: string) => {
    if (field === 'password' && value.includes(' ')) {
      return
    }
    
    setRegisterData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'email') {
      const validation = validateEmail(value)
      setEmailValidation({ ...validation, showTooltip: false })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsLoading(true)
    setLoginError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })

      const data = await response.json()

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const retryMinutes = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 15
        setLoginError(`Too many attempts. Please wait ${retryMinutes} minutes.`)
        return
      }

      if (!response.ok) {
        // Translate common error messages
        let errorMessage = data.error || t.invalidCredentials
        if (errorMessage === 'Invalid email or password' || errorMessage === 'Invalid email or password format') {
          errorMessage = t.invalidCredentials
        } else if (errorMessage === 'Internal server error') {
          errorMessage = 'Internal server error. Please try again.'
        }
        setLoginError(errorMessage)
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

      // Redirect
      if (returnUrl) {
        router.push(returnUrl)
      } else {
        router.push('/user/dashboard')
      }
      
    } catch (err: any) {
      // Translate error messages
      let errorMessage = err.message || t.invalidCredentials
      if (errorMessage === 'Invalid email or password' || errorMessage === 'Invalid email or password format') {
        errorMessage = t.invalidCredentials
      } else if (errorMessage === 'Internal server error' || errorMessage.includes('fetch')) {
        errorMessage = 'An error occurred. Please try again.'
      }
      setLoginError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email
    if (registerData.email) {
      const emailValidation = validateEmail(registerData.email)
      if (!emailValidation.isValid) {
        setRegisterError('Please enter a valid email address')
        return
      }
    }
    
    // Validate phone
    if (!registerData.phone) {
      setRegisterError('Phone number is required')
      return
    }
    
    const cleanedPhone = registerData.phone.replace(/\s/g, '')
    const phoneRegex = /^(\+359|0)[0-9]{9}$/
    if (!phoneRegex.test(cleanedPhone)) {
      setRegisterError('Invalid phone format. Use: +359XXXXXXXXX or 089XXXXXXX')
      return
    }
    
    // Validate password
    if (!registerData.password) {
      setRegisterError('Password is required')
      return
    }
    
    if (registerData.password.length < 8) {
      setRegisterError(t.passwordTooShort)
      return
    }
    
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(registerData.password)) {
      setRegisterError(t.passwordMustContain)
      return
    }
    
    setIsLoading(true)
    setRegisterError('')
    setSuccess('')

    try {
      const cleanedPhone = registerData.phone.replace(/\s/g, '')
      const dataToSend = {
        ...registerData,
        phone: cleanedPhone
      }
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      const data = await response.json()

      if (!response.ok) {
        // Translate error messages
        let errorMessage = ''
        
        if (data && typeof data === 'object' && data.details) {
          // Get first error message from details
          const errorKeys = Object.keys(data.details)
            .filter(key => key.startsWith('error_') || ['name', 'email', 'phone', 'password'].includes(key))
          
          if (errorKeys.length > 0) {
            errorMessage = data.details[errorKeys[0]]
          }
        }
        
        if (!errorMessage && data.error) {
          errorMessage = data.error
        }
        
        if (!errorMessage) {
          errorMessage = 'Registration failed'
        }
        
        // Translate common error messages
        if (errorMessage === 'Email is already taken' || errorMessage === 'Email already exists') {
          errorMessage = 'This email address is already registered'
        } else if (errorMessage === 'Invalid email or password format' || errorMessage.includes('Invalid')) {
          errorMessage = 'Invalid data format'
        } else if (errorMessage === 'Internal server error') {
          errorMessage = 'Internal server error. Please try again.'
        }
        
        setRegisterError(errorMessage)
        return
      }

      setSuccess('Registration successful!')
      
      // Auto-fill login form
      setLoginData({
        email: registerData.email,
        password: registerData.password
      })
      
      // Clear registration form
      setRegisterData({ name: '', email: '', phone: '', password: '' })
      
      setTimeout(() => setIsLogin(true), 2000)
      
    } catch (err: any) {
      // Translate error messages
      let errorMessage = err.message || ('Registration failed')
      if (errorMessage === 'Internal server error' || errorMessage.includes('fetch')) {
        errorMessage = 'An error occurred. Please try again.'
      }
      setRegisterError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      <main className={styles.userPage}>
        <div className={`${styles.wrapper} ${!isLogin ? styles.active : ''} ${(loginError || registerError || success) ? styles.hasMessage : ''}`}>
        <span className={styles.rotateBg}></span>
        <span className={styles.rotateBg2}></span>

        {/* Login Form */}
        <div className={`${styles.formBox} ${styles.login}`}>
          <h2 className={`${styles.title} ${styles.animation}`} style={{ '--i': 0, '--j': 21, paddingTop: '20px' } as React.CSSProperties}>
            {t.login}
          </h2>

          {loginError && isLogin && <div className={styles.errorMessage}>{loginError}</div>}
          
          <form onSubmit={handleLogin}>
            <div className={`${styles.inputBox} ${styles.animation}`} style={{ '--i': 1, '--j': 22 } as React.CSSProperties}>
              <input 
                type="email" 
                required 
                placeholder=" " 
                autoComplete="off"
                value={loginData.email}
                onChange={(e) => handleLoginChange('email', e.target.value)}
                onFocus={() => {
                  if (!emailValidation.isValid && loginData.email) {
                    setEmailValidation(prev => ({ ...prev, showTooltip: true }))
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setEmailValidation(prev => ({ ...prev, showTooltip: false }))
                  }, 100)
                }}
                className={!emailValidation.isValid && loginData.email ? styles.invalidInput : ''}
              />
              <label>{t.email}</label>
              <Mail className={styles.inputIcon} size={18} />
              {!emailValidation.isValid && loginData.email && (
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

            <div className={`${styles.inputBox} ${styles.animation}`} style={{ '--i': 2, '--j': 23 } as React.CSSProperties}>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder=" " 
                autoComplete="new-password"
                value={loginData.password}
                onChange={(e) => handleLoginChange('password', e.target.value)}
              />
              <label>{t.password}</label>
              <Lock className={styles.inputIcon} size={18} />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button 
              type="submit" 
              className={`${styles.btn} ${styles.animation}`} 
              style={{ '--i': 3, '--j': 24 } as React.CSSProperties}
              disabled={isLoading}
            >
              {isLoading ? ('Logging in...') : t.loginButton}
            </button>

            <div className={`${styles.linkTxt} ${styles.animation}`} style={{ '--i': 5, '--j': 25 } as React.CSSProperties}>
              <p>{t.dontHaveAccount} <button type="button" className={styles.linkBtn} onClick={toggleForm}>{t.register}</button></p>
              <p className={styles.forgotPassword}>
                <a 
                  href="/user/forgot-password"
                  className={styles.forgotLink}
                >
                  {t.forgotPassword}
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Login Info Text */}
        <div className={`${styles.infoText} ${styles.login}`}>
          <h2 className={styles.animation} style={{ '--i': 0, '--j': 20 } as React.CSSProperties}>
            {t.welcomeBack}
          </h2>
          <p className={styles.animation} style={{ '--i': 1, '--j': 21 } as React.CSSProperties}>
            {'Login to your account to shop'}
          </p>
        </div>

        {/* Registration Form */}
        <div className={`${styles.formBox} ${styles.register} ${!isLogin ? styles.active : ''}`}>
          <h2 className={`${styles.title} ${styles.animation}`} style={{ '--i': 17, '--j': 0 } as React.CSSProperties}>
            {t.register}
          </h2>
          
          <form onSubmit={handleRegister}>
            <div className={`${styles.inputBox} ${styles.animation}`} style={{ '--i': 18, '--j': 1 } as React.CSSProperties}>
              <input 
                type="text" 
                required 
                placeholder=" " 
                autoComplete="off"
                value={registerData.name}
                onChange={(e) => handleRegisterChange('name', e.target.value)}
              />
              <label>{t.name}</label>
              <User className={styles.inputIcon} size={18} />
            </div>

            <div className={`${styles.inputBox} ${styles.animation}`} style={{ '--i': 19, '--j': 2 } as React.CSSProperties}>
              <input 
                type="email" 
                required 
                placeholder=" " 
                autoComplete="off"
                value={registerData.email}
                onChange={(e) => handleRegisterChange('email', e.target.value)}
                onFocus={() => setEmailValidation(prev => ({ ...prev, showTooltip: true }))}
                onBlur={() => setEmailValidation(prev => ({ ...prev, showTooltip: false }))}
                className={!emailValidation.isValid && registerData.email ? styles.invalidInput : ''}
              />
              <label>{t.email}</label>
              <Mail className={styles.inputIcon} size={18} />
              {!emailValidation.isValid && registerData.email && (
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

            <div className={`${styles.inputBox} ${styles.animation}`} style={{ '--i': 20, '--j': 3 } as React.CSSProperties}>
              <input 
                type="tel" 
                required 
                placeholder=" " 
                autoComplete="off"
                value={registerData.phone}
                onChange={(e) => handleRegisterChange('phone', e.target.value)}
              />
              <label>{t.phone}</label>
              <Phone className={styles.inputIcon} size={18} />
            </div>

            <div className={`${styles.inputBox} ${styles.animation}`} style={{ '--i': 21, '--j': 4 } as React.CSSProperties}>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                required 
                placeholder=" " 
                autoComplete="new-password"
                value={registerData.password}
                onChange={(e) => handleRegisterChange('password', e.target.value)}
              />
              <label>{t.password}</label>
              <Lock className={styles.inputIcon} size={18} />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button 
              type="submit" 
              className={`${styles.btn} ${styles.animation}`} 
              style={{ '--i': 22, '--j': 5 } as React.CSSProperties}
              disabled={isLoading}
            >
              {isLoading ? ('Registering...') : t.registerButton}
            </button>

            {registerError && !isLogin && <div className={styles.errorMessage}>{registerError}</div>}
            {success && !isLogin && <div className={styles.successMessage}>{success}</div>}

            <div className={`${styles.linkTxt} ${styles.animation}`} style={{ '--i': 23, '--j': 6 } as React.CSSProperties}>
              <p>{t.alreadyHaveAccount} <button type="button" className={styles.linkBtn} onClick={toggleForm}>{t.login}</button></p>
            </div>
          </form>
        </div>

        {/* Registration Info Text */}
        <div className={`${styles.infoText} ${styles.register}`}>
          <h2 className={styles.animation} style={{ '--i': 17, '--j': 0 } as React.CSSProperties}>
            {t.createAccount}
          </h2>
          <p className={styles.animation} style={{ '--i': 18, '--j': 1 } as React.CSSProperties}>
            {'Create an account for fast shopping'}
          </p>
        </div>

      </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
