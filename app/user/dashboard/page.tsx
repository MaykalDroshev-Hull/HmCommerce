'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Package, Lock, Edit3, LogOut, RefreshCw, Truck, MapPin, X, Heart } from 'lucide-react'
import styles from './dashboard.module.css'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartDrawer from '@/components/CartDrawer'
import ProductCard from '@/components/ProductCard'
import type { CityOption } from '@/store/checkoutStore'
import type { EcontOfficesData, EcontOffice } from '@/types/econt'
import { Product } from '@/lib/data'

// Favorites List Component
function FavoritesList({ userId, language }: { userId: string; language: string }) {
  const [favorites, setFavorites] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const t = translations[language as 'en' | 'bg']

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/favorites?userId=${userId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch favorites')
        }

        if (data.success && data.productIds) {
          // Fetch full product details for each favorite
          const productsResponse = await fetch('/api/products')
          const productsData = await productsResponse.json()

          if (productsData.success && productsData.products) {
            const favoriteProducts = productsData.products.filter((p: Product) =>
              data.productIds.includes(p.id || p.productid)
            )
            setFavorites(favoriteProducts)
          }
        }
      } catch (err: any) {
        setError(err.message || ('Error loading favorites'))
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchFavorites()
    }
  }, [userId, language])

  if (isLoading) {
    return (
      <div className={styles.emptyState}>
        <p>{'Loading...'}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <p style={{ color: '#ef4444' }}>{error}</p>
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Heart size={48} className={styles.emptyIcon} />
        <h3>{t.favoritesEmpty || 'No favourites yet'}</h3>
        <p>{t.noFavoritesYet || "You haven't added any products to your favourites yet"}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
      {favorites.map((product) => (
        <ProductCard key={product.id || product.productid} product={product} />
      ))}
    </div>
  )
}

interface Order {
  orderId: string
  orderDate: string
  totalAmount: number
  discountAmount: number
  deliveryCost: number
  status: string
  deliveryType: string
  deliveryNotes?: string
  items: Array<{
    productId: number
    variantId: number | null
    name: string
    sku: string
    properties?: Record<string, string>
    quantity: number
    price: number
    totalPrice: number
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout, updateUser } = useAuth()
  const { language } = useLanguage()
  const t = translations[language]
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'favorites'>('orders')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  
  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Delivery preferences states
  const [isEditingDelivery, setIsEditingDelivery] = useState(false)
  const [deliveryData, setDeliveryData] = useState({
    preferredDeliveryType: 'office' as 'office' | 'address' | 'econtomat',
    preferredEcontOfficeId: '',
    preferredCity: '',
    preferredStreet: '',
    preferredStreetNumber: '',
    preferredEntrance: '',
    preferredFloor: '',
    preferredApartment: ''
  })
  const [cities, setCities] = useState<CityOption[]>([])
  const [econtOffices, setEcontOffices] = useState<EcontOfficesData | null>(null)
  const [selectedOffice, setSelectedOffice] = useState<EcontOffice | null>(null)
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/user')
    }
  }, [isAuthenticated, authLoading, router])

  // Check for tab query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tab = urlParams.get('tab')
      if (tab === 'favorites') {
        setActiveTab('favorites')
      }
    }
  }, [])

  // Initialize profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      })
      setDeliveryData({
        preferredDeliveryType: (user.preferredDeliveryType as 'office' | 'address' | 'econtomat') || 'office',
        preferredEcontOfficeId: user.preferredEcontOfficeId || '',
        preferredCity: user.preferredCity || '',
        preferredStreet: user.preferredStreet || '',
        preferredStreetNumber: user.preferredStreetNumber || '',
        preferredEntrance: user.preferredEntrance || '',
        preferredFloor: user.preferredFloor || '',
        preferredApartment: user.preferredApartment || ''
      })
    }
  }, [user])

  // Fetch user data on mount
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchUserData()
      loadCities()
      loadEcontOffices()
    }
  }, [user, isAuthenticated])

  // Load cities data
  const loadCities = async () => {
    const ukCities: CityOption[] = [
      { name: 'London', postcode: 'EC1A', displayName: 'London [EC1A]' },
      { name: 'Manchester', postcode: 'M1', displayName: 'Manchester [M1]' },
      { name: 'Birmingham', postcode: 'B1', displayName: 'Birmingham [B1]' },
      { name: 'Leeds', postcode: 'LS1', displayName: 'Leeds [LS1]' },
      { name: 'Glasgow', postcode: 'G1', displayName: 'Glasgow [G1]' },
      { name: 'Liverpool', postcode: 'L1', displayName: 'Liverpool [L1]' },
      { name: 'Newcastle', postcode: 'NE1', displayName: 'Newcastle [NE1]' },
      { name: 'Sheffield', postcode: 'S1', displayName: 'Sheffield [S1]' },
      { name: 'Bristol', postcode: 'BS1', displayName: 'Bristol [BS1]' },
      { name: 'Belfast', postcode: 'BT1', displayName: 'Belfast [BT1]' },
      { name: 'Edinburgh', postcode: 'EH1', displayName: 'Edinburgh [EH1]' },
      { name: 'Cardiff', postcode: 'CF10', displayName: 'Cardiff [CF10]' },
      { name: 'Leicester', postcode: 'LE1', displayName: 'Leicester [LE1]' },
      { name: 'Coventry', postcode: 'CV1', displayName: 'Coventry [CV1]' },
      { name: 'Bradford', postcode: 'BD1', displayName: 'Bradford [BD1]' },
      { name: 'Nottingham', postcode: 'NG1', displayName: 'Nottingham [NG1]' },
      { name: 'Hull', postcode: 'HU1', displayName: 'Hull [HU1]' },
      { name: 'Stoke-on-Trent', postcode: 'ST1', displayName: 'Stoke-on-Trent [ST1]' },
      { name: 'Wolverhampton', postcode: 'WV1', displayName: 'Wolverhampton [WV1]' },
      { name: 'Plymouth', postcode: 'PL1', displayName: 'Plymouth [PL1]' },
      { name: 'Southampton', postcode: 'SO14', displayName: 'Southampton [SO14]' },
      { name: 'Reading', postcode: 'RG1', displayName: 'Reading [RG1]' },
      { name: 'Derby', postcode: 'DE1', displayName: 'Derby [DE1]' },
      { name: 'Dudley', postcode: 'DY1', displayName: 'Dudley [DY1]' },
      { name: 'Northampton', postcode: 'NN1', displayName: 'Northampton [NN1]' },
      { name: 'Portsmouth', postcode: 'PO1', displayName: 'Portsmouth [PO1]' },
      { name: 'Luton', postcode: 'LU1', displayName: 'Luton [LU1]' },
      { name: 'Preston', postcode: 'PR1', displayName: 'Preston [PR1]' },
      { name: 'Aberdeen', postcode: 'AB10', displayName: 'Aberdeen [AB10]' },
      { name: 'Milton Keynes', postcode: 'MK9', displayName: 'Milton Keynes [MK9]' },
      { name: 'Norwich', postcode: 'NR1', displayName: 'Norwich [NR1]' },
      { name: 'Bournemouth', postcode: 'BH1', displayName: 'Bournemouth [BH1]' }
    ]
    setCities(ukCities)
  }

  // Load Econt offices data
  const loadEcontOffices = async () => {
    try {
      const response = await fetch('/data/econt-offices.json')
      const data: EcontOfficesData = await response.json()
      setEcontOffices(data)
    } catch {
      // Econt offices are optional; delivery UI falls back gracefully
    }
  }

  // Update selected office when city or office ID changes
  useEffect(() => {
    if (econtOffices && deliveryData.preferredCity && deliveryData.preferredEcontOfficeId) {
      // Try to find the city in Econt offices - handle both display name format and plain city name
      let cityName = deliveryData.preferredCity
      
      // If city is in display format like "London [EC1A]", extract just the city name
      const displayNameMatch = cityName.match(/^(.+?)\s*\[/)
      if (displayNameMatch) {
        cityName = displayNameMatch[1].trim()
      }
      
      // Try exact match first
      let cityOffices = econtOffices.officesByCity[cityName] || []
      
      // If no offices found, try to find by partial match
      if (cityOffices.length === 0) {
        const matchingCity = econtOffices.cities.find(c => 
          c.toLowerCase() === cityName.toLowerCase() ||
          c.toLowerCase().includes(cityName.toLowerCase()) ||
          cityName.toLowerCase().includes(c.toLowerCase())
        )
        if (matchingCity) {
          cityOffices = econtOffices.officesByCity[matchingCity] || []
        }
      }
      
      // Find the office by ID
      const office = cityOffices.find(o => o.id === deliveryData.preferredEcontOfficeId)
      setSelectedOffice(office || null)
    } else {
      setSelectedOffice(null)
    }
  }, [econtOffices, deliveryData.preferredCity, deliveryData.preferredEcontOfficeId])

  // Handle city change
  const handleCityChange = (city: string) => {
    setDeliveryData(prev => ({ ...prev, preferredCity: city, preferredEcontOfficeId: '' }))
    setSelectedOffice(null)
    setShowCityDropdown(false)
  }

  // Handle office selection
  const handleOfficeSelect = (officeId: string) => {
    setDeliveryData(prev => ({ ...prev, preferredEcontOfficeId: officeId }))
    
    if (econtOffices && deliveryData.preferredCity) {
      const cityOffices = econtOffices.officesByCity[deliveryData.preferredCity] || []
      const office = cityOffices.find(o => o.id === officeId)
      setSelectedOffice(office || null)
    }
  }

  // Close city dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchUserData = async () => {
    if (!user) return
    
    try {
      // Fetch user's orders
      const ordersResponse = await fetch(`/api/user/orders?userId=${user.id}`)
      const ordersData = await ordersResponse.json()
      
      if (ordersResponse.ok) {
        const sortedOrders = (ordersData.orders || []).sort((a: Order, b: Order) => 
          new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
        )
        setOrders(sortedOrders)
      } else {
        setError(ordersData.error || ('Error loading orders'))
      }
    } catch {
      setError('Error loading orders')
    }
  }

  const handleRefreshOrders = async () => {
    if (!user) return
    
    try {
      setIsRefreshing(true)
      await fetchUserData()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Translate order status
  const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    }
    return statusMap[status.toLowerCase()] || status
  }

  // Handle order card click
  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
  }

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isModalOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false)
        setSelectedOrder(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Logout continues locally even if API call fails
    } finally {
      logout()
      router.push('/user')
    }
  }

  const handleEditProfile = () => {
    setIsEditingProfile(true)
    setError('')
    setSuccess('')
  }

  const handleCancelEdit = () => {
    setIsEditingProfile(false)
    setError('')
    setSuccess('')
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      })
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsUpdating(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || ('Error updating profile'))
      }
      
      setSuccess('Profile updated successfully!')
      setIsEditingProfile(false)
      
      // Update user context with new data
      updateUser({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone
      })
      
    } catch (err: any) {
      setError(err.message || ('Error updating profile'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeliveryUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsUpdating(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          preferredDeliveryType: deliveryData.preferredDeliveryType,
          preferredEcontOfficeId: deliveryData.preferredEcontOfficeId || null,
          preferredCity: deliveryData.preferredCity || null,
          preferredStreet: deliveryData.preferredStreet || null,
          preferredStreetNumber: deliveryData.preferredStreetNumber || null,
          preferredEntrance: deliveryData.preferredEntrance || null,
          preferredFloor: deliveryData.preferredFloor || null,
          preferredApartment: deliveryData.preferredApartment || null
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || ('Error updating preferences'))
      }
      
      setSuccess('Preferences updated successfully!')
      setIsEditingDelivery(false)
      
      // Update user context with new data
      updateUser({
        preferredDeliveryType: deliveryData.preferredDeliveryType,
        preferredEcontOfficeId: deliveryData.preferredEcontOfficeId || undefined,
        preferredCity: deliveryData.preferredCity || undefined,
        preferredStreet: deliveryData.preferredStreet || undefined,
        preferredStreetNumber: deliveryData.preferredStreetNumber || undefined,
        preferredEntrance: deliveryData.preferredEntrance || undefined,
        preferredFloor: deliveryData.preferredFloor || undefined,
        preferredApartment: deliveryData.preferredApartment || undefined
      })
      
    } catch (err: any) {
      setError(err.message || ('Error updating preferences'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    
    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    
    setIsUpdating(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || ('Error changing password'))
      }
      
      setSuccess('Password changed successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      
    } catch (err: any) {
      setError(err.message || ('Error changing password'))
    } finally {
      setIsUpdating(false)
    }
  }

  if (authLoading) {
    return (
      <>
        <Header isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
        <main className={styles.dashboardPage}>
          <div className={styles.container}>
            <div className={styles.loading}>Loading...</div>
          </div>
        </main>
        <Footer />
        <CartDrawer />
      </>
    )
  }

  if (!user || !isAuthenticated) {
    return null
  }

  return (
    <>
      <Header isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      <main className={styles.dashboardPage}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.userInfo}>
            <div>
              <h1>
                {`Welcome back, ${user.name}!`}
              </h1>
              <p>{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={20} />
            {'Logout'}
          </button>
        </header>

        {/* Navigation Tabs */}
        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'orders' ? styles.active : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Package size={20} />
            {'Orders'}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            {'Profile'}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'favorites' ? styles.active : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Heart size={20} />
            {t.myFavorites || ('Favorites')}
          </button>
        </nav>

        {/* Error and Success Messages */}
        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className={styles.tabContent}>
            <section className={styles.ordersSection}>
              <div className={styles.sectionHeader}>
                <Package className={styles.sectionIcon} size={24} />
                <h2>{'Order History'}</h2>
                <button
                  onClick={handleRefreshOrders}
                  disabled={isRefreshing}
                  className={styles.refreshButton}
                  title={'Refresh orders'}
                >
                  <RefreshCw size={18} className={isRefreshing ? styles.spinning : ''} />
                </button>
              </div>
              {orders.length > 0 ? (
                <div className={styles.ordersList}>
                  {orders.map((order) => (
                    <div 
                      key={order.orderId} 
                      className={styles.orderCard}
                      onClick={() => handleOrderClick(order)}
                    >
                      <div className={styles.orderHeader}>
                        <div>
                          <h3>
                            {'Order #'}{order.orderId}
                          </h3>
                          <p className={styles.orderDate}>
                            {new Date(order.orderDate).toLocaleDateString(
                              'en-US',
                              { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }
                            )}
                          </p>
                          <p className={styles.orderStatus}>
                            {'Status: '}
                            <span className={styles.statusBadge}>{translateStatus(order.status)}</span>
                          </p>
                        </div>
                        <div className={styles.orderTotal}>
                          £{order.totalAmount.toFixed(2)}
                        </div>
                      </div>
                      <div className={styles.orderItems}>
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className={styles.orderItem}>
                            <span className={styles.itemName}>{item.name}</span>
                            <span className={styles.itemQuantity}>x{item.quantity}</span>
                            <span className={styles.itemPrice}>£{item.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className={styles.moreItems}>
                            +{order.items.length - 3} {'more items'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Package size={48} className={styles.emptyIcon} />
                  <h3>{'No orders yet'}</h3>
                  <p>
                    {"Start your first order and we'll show it here!"}
                  </p>
                  <button 
                    onClick={() => router.push('/products')}
                    className={styles.primaryBtn}
                  >
                    {'Browse Products'}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className={styles.tabContent}>
            {/* Profile Information */}
            <section className={styles.profileSection}>
              <div className={styles.sectionHeader}>
                <User className={styles.sectionIcon} size={24} />
                <h2>{'Personal Information'}</h2>
                {!isEditingProfile && (
                  <button 
                    onClick={handleEditProfile}
                    className={styles.editButton}
                  >
                    <Edit3 size={16} />
                    {'Edit'}
                  </button>
                )}
              </div>
              
              {!isEditingProfile ? (
                <div className={styles.profileInfo}>
                  <div className={styles.infoRow}>
                    <label>{'Name:'}</label>
                    <span>{user.name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <label>{'Email:'}</label>
                    <span>{user.email}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <label>{'Phone:'}</label>
                    <span>{user.phone || ('Not provided')}</span>
                  </div>
                  {user.created_at && (
                    <div className={styles.infoRow}>
                      <label>{'Member since:'}</label>
                      <span>
                        {new Date(user.created_at).toLocaleDateString(
                          'en-US',
                          { year: 'numeric', month: 'long', day: 'numeric' }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleProfileUpdate} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label htmlFor="profileName">{'Name'}</label>
                    <input
                      type="text"
                      id="profileName"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="profileEmail">{'Email'}</label>
                    <input
                      type="email"
                      id="profileEmail"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="profilePhone">{'Phone'}</label>
                    <input
                      type="tel"
                      id="profilePhone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="07123 456789 or +44 7123 456789"
                      required
                    />
                  </div>
                  
                  <div className={styles.formActions}>
                    <button 
                      type="button"
                      onClick={handleCancelEdit}
                      className={styles.cancelButton}
                      disabled={isUpdating}
                    >
                      {'Cancel'}
                    </button>
                    <button 
                      type="submit" 
                      className={styles.primaryBtn}
                      disabled={isUpdating}
                    >
                      {isUpdating 
                        ? ('Saving...')
                        : ('Save changes')}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Delivery Preferences */}
            <section className={styles.settingsSection}>
              <div className={styles.sectionHeader}>
                <Truck className={styles.sectionIcon} size={24} />
                <h2>{'Delivery Preferences'}</h2>
                {!isEditingDelivery && (
                  <button 
                    onClick={() => setIsEditingDelivery(true)}
                    className={styles.editButton}
                  >
                    <Edit3 size={16} />
                    {'Edit'}
                  </button>
                )}
              </div>
              
              {!isEditingDelivery ? (
                <div className={styles.profileInfo}>
                  <div className={styles.infoRow}>
                    <label>{'Delivery Type:'}</label>
                    <span>
                      {deliveryData.preferredDeliveryType === 'office' 
                        ? ('Office')
                        : deliveryData.preferredDeliveryType === 'address'
                        ? ('Address')
                        : ('Econtomat')}
                    </span>
                  </div>
                  {deliveryData.preferredCity && (
                    <div className={styles.infoRow}>
                      <label>{'City:'}</label>
                      <span>{deliveryData.preferredCity}</span>
                    </div>
                  )}
                  {deliveryData.preferredDeliveryType === 'office' && deliveryData.preferredEcontOfficeId && (
                    <div className={styles.infoRow}>
                      <label>{'Econt Office:'}</label>
                      <span>
                        {selectedOffice ? selectedOffice.name : deliveryData.preferredEcontOfficeId}
                      </span>
                    </div>
                  )}
                  {deliveryData.preferredDeliveryType === 'office' && selectedOffice && (
                    <div className={styles.infoRow}>
                      <label>{'Office Address:'}</label>
                      <span>{selectedOffice.address}</span>
                    </div>
                  )}
                  {deliveryData.preferredDeliveryType === 'office' && selectedOffice && (
                    <div className={styles.infoRow}>
                      <label>{'Working Hours:'}</label>
                      <span>{selectedOffice.workingHours}</span>
                    </div>
                  )}
                  {deliveryData.preferredDeliveryType === 'address' && (
                    <>
                      {deliveryData.preferredStreet && (
                        <div className={styles.infoRow}>
                          <label>{'Street:'}</label>
                          <span>{deliveryData.preferredStreet}</span>
                        </div>
                      )}
                      {deliveryData.preferredStreetNumber && (
                        <div className={styles.infoRow}>
                          <label>{'Number:'}</label>
                          <span>{deliveryData.preferredStreetNumber}</span>
                        </div>
                      )}
                      {deliveryData.preferredEntrance && (
                        <div className={styles.infoRow}>
                          <label>{'Entrance:'}</label>
                          <span>{deliveryData.preferredEntrance}</span>
                        </div>
                      )}
                      {deliveryData.preferredFloor && (
                        <div className={styles.infoRow}>
                          <label>{'Floor:'}</label>
                          <span>{deliveryData.preferredFloor}</span>
                        </div>
                      )}
                      {deliveryData.preferredApartment && (
                        <div className={styles.infoRow}>
                          <label>{'Apartment:'}</label>
                          <span>{deliveryData.preferredApartment}</span>
                        </div>
                      )}
                    </>
                  )}
                  {!deliveryData.preferredCity && (
                    <p className={styles.emptyState}>
                      {'No delivery preferences saved'}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleDeliveryUpdate} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>{'Delivery Type'}</label>
                    <select
                      value={deliveryData.preferredDeliveryType}
                      onChange={(e) => {
                        const newType = e.target.value as 'office' | 'address' | 'econtomat'
                        setDeliveryData(prev => ({ 
                          ...prev, 
                          preferredDeliveryType: newType,
                          preferredEcontOfficeId: newType !== 'office' ? '' : prev.preferredEcontOfficeId
                        }))
                      }}
                    >
                      <option value="office">{'Office'}</option>
                      <option value="address">{'Address'}</option>
                      <option value="econtomat" disabled>{'Econtomat (Disabled)'}</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>{'City'}</label>
                    <div className="relative" ref={cityDropdownRef}>
                      <input
                        type="text"
                        value={deliveryData.preferredCity}
                        onChange={(e) => {
                          const value = e.target.value
                          setDeliveryData(prev => ({ ...prev, preferredCity: value, preferredEcontOfficeId: '' }))
                          setShowCityDropdown(true)
                          setSelectedOffice(null)
                        }}
                        onFocus={() => setShowCityDropdown(true)}
                        placeholder={'Select city'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {showCityDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {/* Show Econt cities if office delivery is selected and data is loaded */}
                          {deliveryData.preferredDeliveryType === 'office' && econtOffices ? (
                            econtOffices.cities
                              .filter((city) => 
                                city.toLowerCase().includes((deliveryData.preferredCity || '').toLowerCase())
                              )
                              .map((city) => (
                                <button
                                  key={city}
                                  type="button"
                                  onClick={() => handleCityChange(city)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                  {city}
                                </button>
                              ))
                          ) : (
                            cities
                              .filter((city) => 
                                city.name.toLowerCase().includes((deliveryData.preferredCity || '').toLowerCase()) ||
                                city.displayName.toLowerCase().includes((deliveryData.preferredCity || '').toLowerCase()) ||
                                city.postcode.includes(deliveryData.preferredCity || '')
                              )
                              .map((city) => (
                                <button
                                  key={city.displayName}
                                  type="button"
                                  onClick={() => handleCityChange(city.displayName)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                  {city.displayName}
                                </button>
                              ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {deliveryData.preferredDeliveryType === 'office' && deliveryData.preferredCity && econtOffices && (
                    <div className={styles.formGroup}>
                      <label>{'Econt Office'}</label>
                      <select
                        value={deliveryData.preferredEcontOfficeId || ''}
                        onChange={(e) => handleOfficeSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">{'Select office'}</option>
                        {(econtOffices.officesByCity[deliveryData.preferredCity] || []).map((office) => (
                          <option key={office.id} value={office.id}>
                            {office.name}
                          </option>
                        ))}
                      </select>
                      {selectedOffice && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">{'Address:'}</span>
                              <p>{selectedOffice.address}</p>
                            </div>
                            <div>
                              <span className="font-medium">{'Working Hours:'}</span>
                              <p>{selectedOffice.workingHours}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {deliveryData.preferredDeliveryType === 'address' && (
                    <>
                      <div className={styles.formGroup}>
                        <label>{'Street'}</label>
                        <input
                          type="text"
                          value={deliveryData.preferredStreet}
                          onChange={(e) => setDeliveryData(prev => ({ ...prev, preferredStreet: e.target.value }))}
                          placeholder="High Street"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>{'Street Number'}</label>
                        <input
                          type="text"
                          value={deliveryData.preferredStreetNumber}
                          onChange={(e) => setDeliveryData(prev => ({ ...prev, preferredStreetNumber: e.target.value }))}
                          placeholder="123"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>{'Entrance'}</label>
                        <input
                          type="text"
                          value={deliveryData.preferredEntrance}
                          onChange={(e) => setDeliveryData(prev => ({ ...prev, preferredEntrance: e.target.value }))}
                          placeholder="A"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>{'Floor'}</label>
                        <input
                          type="text"
                          value={deliveryData.preferredFloor}
                          onChange={(e) => setDeliveryData(prev => ({ ...prev, preferredFloor: e.target.value }))}
                          placeholder="5"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>{'Apartment'}</label>
                        <input
                          type="text"
                          value={deliveryData.preferredApartment}
                          onChange={(e) => setDeliveryData(prev => ({ ...prev, preferredApartment: e.target.value }))}
                          placeholder="12"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className={styles.formActions}>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditingDelivery(false)
                        if (user) {
                          const resetData = {
                            preferredDeliveryType: (user.preferredDeliveryType as 'office' | 'address' | 'econtomat') || 'office',
                            preferredEcontOfficeId: user.preferredEcontOfficeId || '',
                            preferredCity: user.preferredCity || '',
                            preferredStreet: user.preferredStreet || '',
                            preferredStreetNumber: user.preferredStreetNumber || '',
                            preferredEntrance: user.preferredEntrance || '',
                            preferredFloor: user.preferredFloor || '',
                            preferredApartment: user.preferredApartment || ''
                          }
                          setDeliveryData(resetData)
                          // Reset selected office will be handled by useEffect
                        }
                      }}
                      className={styles.cancelButton}
                      disabled={isUpdating}
                    >
                      {'Cancel'}
                    </button>
                    <button 
                      type="submit" 
                      className={styles.primaryBtn}
                      disabled={isUpdating}
                    >
                      {isUpdating 
                        ? ('Saving...')
                        : ('Save changes')}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Change Password */}
            <section className={styles.settingsSection}>
              <div className={styles.sectionHeader}>
                <Lock className={styles.sectionIcon} size={24} />
                <h2>{'Change Password'}</h2>
              </div>
              <form onSubmit={handlePasswordChange} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="currentPassword">
                    {'Current Password'}
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="newPassword">
                    {'New Password'}
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword">
                    {'Confirm New Password'}
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className={styles.primaryBtn}
                  disabled={isUpdating}
                >
                  {isUpdating 
                    ? ('Updating...')
                    : ('Change Password')}
                </button>
              </form>
            </section>
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className={styles.tabContent}>
            <section className={styles.ordersSection}>
              <div className={styles.sectionHeader}>
                <Heart className={styles.sectionIcon} size={24} />
                <h2>{t.myFavorites || ('My Favorites')}</h2>
              </div>
              <FavoritesList userId={user.id} language={language} />
            </section>
          </div>
        )}
      </div>
      </main>
      <Footer />
      <CartDrawer />

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {'Order Details #'}{selectedOrder.orderId}
              </h2>
              <button 
                className={styles.modalCloseBtn}
                onClick={handleCloseModal}
                aria-label={'Close'}
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Order Info */}
              <div className={styles.modalSection}>
                <div className={styles.modalInfoRow}>
                  <span className={styles.modalLabel}>{'Date:'}</span>
                  <span className={styles.modalValue}>
                    {new Date(selectedOrder.orderDate).toLocaleDateString(
                      'en-US',
                      { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }
                    )}
                  </span>
                </div>
                <div className={styles.modalInfoRow}>
                  <span className={styles.modalLabel}>{'Status:'}</span>
                  <span className={styles.statusBadge}>{translateStatus(selectedOrder.status)}</span>
                </div>
                <div className={styles.modalInfoRow}>
                  <span className={styles.modalLabel}>{'Delivery Type:'}</span>
                  <span className={styles.modalValue}>
                    {selectedOrder.deliveryType === 'office' 
                      ? ('Office')
                      : selectedOrder.deliveryType === 'address'
                      ? ('Address')
                      : ('Econtomat')}
                  </span>
                </div>
                {selectedOrder.deliveryNotes && (
                  <div className={styles.modalInfoRow}>
                    <span className={styles.modalLabel}>{'Notes:'}</span>
                    <span className={styles.modalValue}>{selectedOrder.deliveryNotes}</span>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>
                  {'Items'}
                </h3>
                <div className={styles.modalItemsList}>
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className={styles.modalItem}>
                      <div className={styles.modalItemInfo}>
                        <span className={styles.modalItemName}>{item.name}</span>
                        {item.properties && Object.keys(item.properties).length > 0 && (
                          <div className={styles.modalItemProperties}>
                            {Object.entries(item.properties).map(([propName, propValue]) => (
                              <span key={propName} className={styles.modalPropertyTag}>
                                <span className={styles.modalPropertyName}>{propName}:</span>
                                <span className={styles.modalPropertyValue}>{propValue}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={styles.modalItemDetails}>
                        <span className={styles.modalItemQuantity}>
                          {'Quantity:'} {item.quantity}
                        </span>
                        <span className={styles.modalItemPrice}>
                          £{item.price.toFixed(2)} each
                        </span>
                        <span className={styles.modalItemTotal}>
                          £{item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className={styles.modalSection}>
                <div className={styles.modalSummary}>
                  <div className={styles.modalSummaryRow}>
                    <span>{'Subtotal:'}</span>
                    <span>
                      £{(selectedOrder.totalAmount - selectedOrder.deliveryCost - (selectedOrder.discountAmount || 0)).toFixed(2)}
                    </span>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div className={styles.modalSummaryRow}>
                      <span>{'Discount:'}</span>
                      <span style={{ color: 'hsl(var(--success))' }}>
                        -£{selectedOrder.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className={styles.modalSummaryRow}>
                    <span>{'Delivery:'}</span>
                    <span>£{selectedOrder.deliveryCost.toFixed(2)}</span>
                  </div>
                  <div className={styles.modalSummaryRowTotal}>
                    <span>{'Total:'}</span>
                    <span>£{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.primaryBtn}
                onClick={handleCloseModal}
              >
                {'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
