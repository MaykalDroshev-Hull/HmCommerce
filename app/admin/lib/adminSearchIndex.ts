export interface SearchableItem {
  id: string;
  type: 'page' | 'section' | 'header' | 'field' | 'action';
  path: string;
  title: string;
  titleBg: string;
  description?: string;
  parentPath?: string;
  keywords: string[];
}

export const adminSearchIndex: SearchableItem[] = [
  // Dashboard
  {
    id: 'dashboard',
    type: 'page',
    path: '/admin',
    title: 'Dashboard',
    titleBg: '',
    description: '',
    keywords: ['dashboard', 'overview', 'home', 'main', ]
  },
  {
    id: 'dashboard-key-metrics',
    type: 'section',
    path: '/admin',
    title: 'Key Metrics',
    titleBg: '',
    parentPath: '/admin',
    keywords: ['metrics', 'statistics', 'stats', 'key', ]
  },
  {
    id: 'dashboard-weekly-orders',
    type: 'section',
    path: '/admin',
    title: 'Weekly Orders Chart',
    titleBg: '',
    parentPath: '/admin',
    keywords: ['chart', 'orders', 'weekly', 'graph', ]
  },
  {
    id: 'dashboard-product-type-performance',
    type: 'section',
    path: '/admin',
    title: 'Orders by Category',
    titleBg: '',
    parentPath: '/admin',
    keywords: ['product type', 'performance', 'category', ]
  },
  {
    id: 'dashboard-recent-orders',
    type: 'section',
    path: '/admin',
    title: 'Recent Orders',
    titleBg: '',
    parentPath: '/admin',
    keywords: ['recent', 'orders', 'latest', ]
  },
  {
    id: 'dashboard-top-products',
    type: 'section',
    path: '/admin',
    title: 'Top Products',
    titleBg: '',
    parentPath: '/admin',
    keywords: ['top', 'products', 'best', 'selling', ]
  },

  // Properties
  {
    id: 'properties',
    type: 'page',
    path: '/admin/properties',
    title: 'Characteristics',
    titleBg: '',
    description: '',
    keywords: ['properties', 'attributes', 'characteristics', ]
  },
  {
    id: 'properties-list',
    type: 'section',
    path: '/admin/properties',
    title: 'Characteristics List',
    titleBg: '',
    parentPath: '/admin/properties',
    keywords: ['list', 'all', ]
  },
  {
    id: 'properties-add',
    type: 'action',
    path: '/admin/properties',
    title: 'Add Characteristic',
    titleBg: '',
    parentPath: '/admin/properties',
    keywords: ['add', 'create', 'new', ]
  },
  {
    id: 'property-name',
    type: 'field',
    path: '/admin/properties',
    title: 'Property Name',
    titleBg: '',
    parentPath: '/admin/properties',
    keywords: ['name', 'title', ]
  },
  {
    id: 'property-description',
    type: 'field',
    path: '/admin/properties',
    title: 'Description',
    titleBg: '',
    parentPath: '/admin/properties',
    keywords: ['description', 'details', ]
  },
  {
    id: 'property-data-type',
    type: 'field',
    path: '/admin/properties',
    title: 'Data Type',
    titleBg: '',
    parentPath: '/admin/properties',
    keywords: ['data type', 'type', ]
  },
  {
    id: 'property-values',
    type: 'section',
    path: '/admin/properties',
    title: 'Property Values',
    titleBg: '',
    parentPath: '/admin/properties',
    keywords: ['values', 'options', 'choices', ]
  },
  {
    id: 'property-add-value',
    type: 'action',
    path: '/admin/properties',
    title: 'Add Property Value',
    titleBg: '',
    parentPath: '/admin/properties',
    keywords: ['add value', 'new value', ]
  },
  {
    id: 'property-display-order',
    type: 'field',
    path: '/admin/properties',
    title: 'Display Order',
    titleBg: '',
    parentPath: '/admin/properties',
    keywords: ['order', 'sort', 'display', ]
  },

  // Product Types
  {
    id: 'product-types',
    type: 'page',
    path: '/admin/product-types',
    title: 'Categories',
    titleBg: '',
    description: '',
    keywords: ['product types', 'categories', 'types', ]
  },
  {
    id: 'product-types-list',
    type: 'section',
    path: '/admin/product-types',
    title: 'Categories List',
    titleBg: '',
    parentPath: '/admin/product-types',
    keywords: ['list', 'all', ]
  },
  {
    id: 'product-types-add',
    type: 'action',
    path: '/admin/product-types',
    title: 'Add Category',
    titleBg: '',
    parentPath: '/admin/product-types',
    keywords: ['add', 'create', 'new', ]
  },
  {
    id: 'product-type-name',
    type: 'field',
    path: '/admin/product-types',
    title: 'Product Type Name',
    titleBg: '',
    parentPath: '/admin/product-types',
    keywords: ['name', 'title', ]
  },
  {
    id: 'product-type-code',
    type: 'field',
    path: '/admin/product-types',
    title: 'Code',
    titleBg: '',
    parentPath: '/admin/product-types',
    keywords: ['code', 'identifier', ]
  },
  {
    id: 'product-types-manage-properties',
    type: 'action',
    path: '/admin/product-types',
    title: 'Manage Properties',
    titleBg: '',
    parentPath: '/admin/product-types',
    keywords: ['manage', 'properties', 'configure', ]
  },

  // Products
  {
    id: 'products',
    type: 'page',
    path: '/admin/products',
    title: 'Items',
    titleBg: '',
    description: '',
    keywords: ['products', 'items', 'goods', ]
  },
  {
    id: 'products-list',
    type: 'section',
    path: '/admin/products',
    title: 'Items List',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['list', 'all', ]
  },
  {
    id: 'products-add',
    type: 'action',
    path: '/admin/products',
    title: 'Add Item',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['add', 'create', 'new', ]
  },
  {
    id: 'product-name',
    type: 'field',
    path: '/admin/products',
    title: 'Product Name',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['name', 'title', ]
  },
  {
    id: 'product-sku',
    type: 'field',
    path: '/admin/products',
    title: 'SKU',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['sku', 'code', 'identifier', ]
  },
  {
    id: 'product-description',
    type: 'field',
    path: '/admin/products',
    title: 'Description',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['description', 'details', ]
  },
  {
    id: 'product-main-category',
    type: 'field',
    path: '/admin/products',
    title: 'Main Category',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['category', 'main', 'primary', ]
  },
  {
    id: 'product-type',
    type: 'field',
    path: '/admin/products',
    title: 'Product Type',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['type', 'product type', ]
  },
  {
    id: 'product-featured',
    type: 'field',
    path: '/admin/products',
    title: 'Featured Product',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['featured', 'highlighted', 'promoted', ]
  },
  {
    id: 'product-variant-properties',
    type: 'section',
    path: '/admin/products',
    title: 'Variant Properties',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['variants', 'properties', 'options', ]
  },
  {
    id: 'product-generate-variants',
    type: 'action',
    path: '/admin/products',
    title: 'Generate Variants',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['generate', 'create variants', ]
  },
  {
    id: 'product-variants',
    type: 'section',
    path: '/admin/products',
    title: 'Variants',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['variants', 'options', 'versions', ]
  },
  {
    id: 'variant-price',
    type: 'field',
    path: '/admin/products',
    title: 'Price',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['price', 'cost', 'amount', ]
  },
  {
    id: 'variant-quantity',
    type: 'field',
    path: '/admin/products',
    title: 'Quantity',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['quantity', 'stock', 'amount', ]
  },
  {
    id: 'variant-image',
    type: 'field',
    path: '/admin/products',
    title: 'Image',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['image', 'photo', 'picture', ]
  },
  {
    id: 'variant-primary',
    type: 'field',
    path: '/admin/products',
    title: 'Primary Image',
    titleBg: '',
    parentPath: '/admin/products',
    keywords: ['primary', 'main', 'default', ]
  },

  // Sales
  {
    id: 'sales',
    type: 'page',
    path: '/admin/sales',
    title: 'Sales',
    titleBg: '',
    description: '',
    keywords: ['sales', 'transactions', 'revenue', ]
  },

  // Customers
  {
    id: 'customers',
    type: 'page',
    path: '/admin/customers',
    title: 'Customers',
    titleBg: '',
    description: '',
    keywords: ['customers', 'users', 'clients', ]
  },
  {
    id: 'customers-total',
    type: 'section',
    path: '/admin/customers',
    title: 'Total Customers',
    titleBg: '',
    parentPath: '/admin/customers',
    keywords: ['total', 'all', ]
  },
  {
    id: 'customers-active',
    type: 'section',
    path: '/admin/customers',
    title: 'Active Customers',
    titleBg: '',
    parentPath: '/admin/customers',
    keywords: ['active', 'engaged', ]
  },
  {
    id: 'customer-name',
    type: 'field',
    path: '/admin/customers',
    title: 'Name',
    titleBg: '',
    parentPath: '/admin/customers',
    keywords: ['name', ]
  },
  {
    id: 'customer-email',
    type: 'field',
    path: '/admin/customers',
    title: 'Email',
    titleBg: '',
    parentPath: '/admin/customers',
    keywords: ['email', 'e-mail', ]
  },
  {
    id: 'customer-total-orders',
    type: 'field',
    path: '/admin/customers',
    title: 'Total Orders',
    titleBg: '',
    parentPath: '/admin/customers',
    keywords: ['orders', 'total', ]
  },
  {
    id: 'customer-total-spent',
    type: 'field',
    path: '/admin/customers',
    title: 'Total Spent',
    titleBg: '',
    parentPath: '/admin/customers',
    keywords: ['spent', 'revenue', 'total', ]
  },
  {
    id: 'customer-last-order',
    type: 'field',
    path: '/admin/customers',
    title: 'Last Order',
    titleBg: '',
    parentPath: '/admin/customers',
    keywords: ['last', 'recent', ]
  },
  {
    id: 'customer-joined',
    type: 'field',
    path: '/admin/customers',
    title: 'Joined',
    titleBg: '',
    parentPath: '/admin/customers',
    keywords: ['joined', 'registered', 'created', ]
  },

  // Analytics
  {
    id: 'analytics',
    type: 'page',
    path: '/admin/analytics',
    title: 'Analytics',
    titleBg: '',
    description: '',
    keywords: ['analytics', 'reports', 'statistics', ]
  },
  {
    id: 'analytics-total-orders',
    type: 'field',
    path: '/admin/analytics',
    title: 'Total Orders',
    titleBg: '',
    parentPath: '/admin/analytics',
    keywords: ['orders', 'total', ]
  },
  {
    id: 'analytics-total-revenue',
    type: 'field',
    path: '/admin/analytics',
    title: 'Total Revenue',
    titleBg: '',
    parentPath: '/admin/analytics',
    keywords: ['revenue', 'income', 'total', ]
  },
  {
    id: 'analytics-total-customers',
    type: 'field',
    path: '/admin/analytics',
    title: 'Total Customers',
    titleBg: '',
    parentPath: '/admin/analytics',
    keywords: ['customers', 'total', ]
  },
  {
    id: 'analytics-average-order-value',
    type: 'field',
    path: '/admin/analytics',
    title: 'Average Order Value',
    titleBg: '',
    parentPath: '/admin/analytics',
    keywords: ['average', 'order value', 'mean', ]
  },

  // Visitors
  {
    id: 'visitors',
    type: 'page',
    path: '/admin/visitors',
    title: 'Visitors',
    titleBg: '',
    description: '',
    keywords: ['visitors', 'analytics', 'traffic', ]
  },
  {
    id: 'visitors-summary',
    type: 'section',
    path: '/admin/visitors',
    title: 'Visitor Summary',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['summary', 'overview', ]
  },
  {
    id: 'visitors-total',
    type: 'field',
    path: '/admin/visitors',
    title: 'Total Visitors',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['visitors', 'total', ]
  },
  {
    id: 'visitors-sessions',
    type: 'field',
    path: '/admin/visitors',
    title: 'Total Sessions',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['sessions', 'total', ]
  },
  {
    id: 'visitors-page-views',
    type: 'field',
    path: '/admin/visitors',
    title: 'Total Page Views',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['page views', 'views', ]
  },
  {
    id: 'visitors-bounce-rate',
    type: 'field',
    path: '/admin/visitors',
    title: 'Bounce Rate',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['bounce rate', 'bounce', ]
  },
  {
    id: 'visitors-top-countries',
    type: 'section',
    path: '/admin/visitors',
    title: 'Top Countries',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['countries', 'top', ]
  },
  {
    id: 'visitors-device-types',
    type: 'section',
    path: '/admin/visitors',
    title: 'Device Types',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['devices', 'types', ]
  },
  {
    id: 'visitors-browsers',
    type: 'section',
    path: '/admin/visitors',
    title: 'Browsers',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['browsers', ]
  },
  {
    id: 'visitors-operating-systems',
    type: 'section',
    path: '/admin/visitors',
    title: 'Operating Systems',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['operating systems', 'os', ]
  },
  {
    id: 'visitors-referrer-sources',
    type: 'section',
    path: '/admin/visitors',
    title: 'Referrer Sources',
    titleBg: '',
    parentPath: '/admin/visitors',
    keywords: ['referrer', 'sources', 'traffic', ]
  },

  // Finance
  {
    id: 'finance',
    type: 'page',
    path: '/admin/finance',
    title: 'Finance',
    titleBg: '',
    description: '',
    keywords: ['finance', 'financial', 'money', 'transactions', ]
  },
  {
    id: 'finance-total-revenue',
    type: 'field',
    path: '/admin/finance',
    title: 'Total Revenue',
    titleBg: '',
    parentPath: '/admin/finance',
    keywords: ['revenue', 'income', 'total', ]
  },
  {
    id: 'finance-total-orders',
    type: 'field',
    path: '/admin/finance',
    title: 'Total Orders',
    titleBg: '',
    parentPath: '/admin/finance',
    keywords: ['orders', 'total', ]
  },
  {
    id: 'finance-average-order-value',
    type: 'field',
    path: '/admin/finance',
    title: 'Average Order Value',
    titleBg: '',
    parentPath: '/admin/finance',
    keywords: ['average', 'order value', ]
  },
  {
    id: 'finance-monthly-revenue',
    type: 'field',
    path: '/admin/finance',
    title: 'Monthly Revenue',
    titleBg: '',
    parentPath: '/admin/finance',
    keywords: ['monthly', 'revenue', ]
  },
  {
    id: 'finance-pending-payments',
    type: 'field',
    path: '/admin/finance',
    title: 'Pending Payments',
    titleBg: '',
    parentPath: '/admin/finance',
    keywords: ['pending', 'payments', ]
  },
  {
    id: 'finance-net-revenue',
    type: 'field',
    path: '/admin/finance',
    title: 'Net Revenue',
    titleBg: '',
    parentPath: '/admin/finance',
    keywords: ['net', 'revenue', ]
  },
  {
    id: 'finance-transactions',
    type: 'section',
    path: '/admin/finance',
    title: 'Transactions',
    titleBg: '',
    parentPath: '/admin/finance',
    keywords: ['transactions', ]
  },

  // Discounts
  {
    id: 'discounts',
    type: 'page',
    path: '/admin/discounts',
    title: 'Discounts',
    titleBg: '',
    description: '',
    keywords: ['discounts', 'coupons', 'promo', 'codes', ]
  },
  {
    id: 'discounts-list',
    type: 'section',
    path: '/admin/discounts',
    title: 'Discounts List',
    titleBg: '',
    parentPath: '/admin/discounts',
    keywords: ['list', 'all', ]
  },
  {
    id: 'discounts-add',
    type: 'action',
    path: '/admin/discounts',
    title: 'Add Discount',
    titleBg: '',
    parentPath: '/admin/discounts',
    keywords: ['add', 'create', 'new', ]
  },
  {
    id: 'discount-code',
    type: 'field',
    path: '/admin/discounts',
    title: 'Discount Code',
    titleBg: '',
    parentPath: '/admin/discounts',
    keywords: ['code', 'coupon', ]
  },
  {
    id: 'discount-description',
    type: 'field',
    path: '/admin/discounts',
    title: 'Description',
    titleBg: '',
    parentPath: '/admin/discounts',
    keywords: ['description', 'details', ]
  },
  {
    id: 'discount-type',
    type: 'field',
    path: '/admin/discounts',
    title: 'Discount Type',
    titleBg: '',
    parentPath: '/admin/discounts',
    keywords: ['type', 'percentage', 'fixed', ]
  },
  {
    id: 'discount-value',
    type: 'field',
    path: '/admin/discounts',
    title: 'Discount Value',
    titleBg: '',
    parentPath: '/admin/discounts',
    keywords: ['value', 'amount', 'percentage', ]
  },
  {
    id: 'discount-active',
    type: 'field',
    path: '/admin/discounts',
    title: 'Active',
    titleBg: '',
    parentPath: '/admin/discounts',
    keywords: ['active', 'enabled', ]
  },
  {
    id: 'discount-expires',
    type: 'field',
    path: '/admin/discounts',
    title: 'Expires At',
    titleBg: '',
    parentPath: '/admin/discounts',
    keywords: ['expires', 'expiry', 'expiration', ]
  },

  // Media
  {
    id: 'media',
    type: 'page',
    path: '/admin/media',
    title: 'Media',
    titleBg: '',
    description: '',
    keywords: ['media', 'files', 'images', 'photos', 'upload', ]
  },
  {
    id: 'media-library',
    type: 'section',
    path: '/admin/media',
    title: 'Media Library',
    titleBg: '',
    parentPath: '/admin/media',
    keywords: ['library', 'files', ]
  },
  {
    id: 'media-upload',
    type: 'action',
    path: '/admin/media',
    title: 'Upload Media',
    titleBg: '',
    parentPath: '/admin/media',
    keywords: ['upload', 'add', ]
  },
  {
    id: 'media-folder',
    type: 'field',
    path: '/admin/media',
    title: 'Folder',
    titleBg: '',
    parentPath: '/admin/media',
    keywords: ['folder', 'directory', ]
  },

  // Settings
  {
    id: 'settings',
    type: 'page',
    path: '/admin/settings',
    title: 'Settings',
    titleBg: '',
    description: '',
    keywords: ['settings', 'configuration', 'config', 'preferences', ]
  },
  {
    id: 'settings-store-information',
    type: 'section',
    path: '/admin/settings',
    title: 'Store Information',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['store', 'information', 'details', ]
  },
  {
    id: 'settings-store-name',
    type: 'field',
    path: '/admin/settings',
    title: 'Store Name',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['store name', 'name', ]
  },
  {
    id: 'settings-email',
    type: 'field',
    path: '/admin/settings',
    title: 'Email',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['email', 'e-mail', ]
  },
  {
    id: 'settings-telephone',
    type: 'field',
    path: '/admin/settings',
    title: 'Telephone Number',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['telephone', 'phone', 'number', ]
  },
  {
    id: 'settings-year-creation',
    type: 'field',
    path: '/admin/settings',
    title: 'Year of Creation',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['year', 'creation', 'founded', ]
  },
  {
    id: 'settings-closing-remarks',
    type: 'field',
    path: '/admin/settings',
    title: 'Closing Remarks',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['closing', 'remarks', 'message', ]
  },
  {
    id: 'settings-about-us',
    type: 'section',
    path: '/admin/settings',
    title: 'About Us Page',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['about us', 'about', ]
  },
  {
    id: 'settings-about-us-photo',
    type: 'field',
    path: '/admin/settings',
    title: 'About Us Photo',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['photo', 'image', 'picture', ]
  },
  {
    id: 'settings-about-us-text',
    type: 'field',
    path: '/admin/settings',
    title: 'About Us Text',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['text', 'content', ]
  },
  {
    id: 'settings-logo',
    type: 'field',
    path: '/admin/settings',
    title: 'Logo',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['logo', 'brand', ]
  },
  {
    id: 'settings-hero-image',
    type: 'field',
    path: '/admin/settings',
    title: 'Hero Image',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['hero', 'image', 'banner', ]
  },
  {
    id: 'settings-appearance',
    type: 'section',
    path: '/admin/settings',
    title: 'Appearance',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['appearance', 'theme', 'design', ]
  },
  {
    id: 'settings-color-palette',
    type: 'field',
    path: '/admin/settings',
    title: 'Color Palette',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['color', 'palette', 'theme', ]
  },
  {
    id: 'settings-language',
    type: 'field',
    path: '/admin/settings',
    title: 'Language',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['language', 'lang', ]
  },
  {
    id: 'settings-banner',
    type: 'section',
    path: '/admin/settings',
    title: 'Banner',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['banner', 'notification', ]
  },
  {
    id: 'settings-banner-text',
    type: 'field',
    path: '/admin/settings',
    title: 'Banner Text',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['banner text', 'text', 'message', ]
  },
  {
    id: 'settings-banner-duration',
    type: 'field',
    path: '/admin/settings',
    title: 'Rotation Duration',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['duration', 'rotation', 'time', ]
  },
  {
    id: 'settings-social-media',
    type: 'section',
    path: '/admin/settings',
    title: 'Social Media',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['social media', 'social', 'networks', ]
  },
  {
    id: 'settings-discord',
    type: 'field',
    path: '/admin/settings',
    title: 'Discord URL',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['discord', 'url', 'link']
  },
  {
    id: 'settings-facebook',
    type: 'field',
    path: '/admin/settings',
    title: 'Facebook URL',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['facebook', 'url', 'link']
  },
  {
    id: 'settings-pinterest',
    type: 'field',
    path: '/admin/settings',
    title: 'Pinterest URL',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['pinterest', 'url', 'link']
  },
  {
    id: 'settings-youtube',
    type: 'field',
    path: '/admin/settings',
    title: 'YouTube URL',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['youtube', 'url', 'link']
  },
  {
    id: 'settings-instagram',
    type: 'field',
    path: '/admin/settings',
    title: 'Instagram URL',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['instagram', 'url', 'link']
  },
  {
    id: 'settings-x',
    type: 'field',
    path: '/admin/settings',
    title: 'X (Twitter) URL',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['x', 'twitter', 'url', 'link']
  },
  {
    id: 'settings-tiktok',
    type: 'field',
    path: '/admin/settings',
    title: 'TikTok URL',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['tiktok', 'url', 'link']
  },
  {
    id: 'settings-save',
    type: 'action',
    path: '/admin/settings',
    title: 'Save Settings',
    titleBg: '',
    parentPath: '/admin/settings',
    keywords: ['save', 'store', ]
  },

  // Orders
  {
    id: 'orders',
    type: 'page',
    path: '/admin/orders',
    title: 'Orders',
    titleBg: '',
    description: '',
    keywords: ['orders', 'purchases', 'transactions', ]
  },
  {
    id: 'orders-list',
    type: 'section',
    path: '/admin/orders',
    title: 'Orders List',
    titleBg: '',
    parentPath: '/admin/orders',
    keywords: ['list', 'all', ]
  },
  {
    id: 'order-status',
    type: 'field',
    path: '/admin/orders',
    title: 'Order Status',
    titleBg: '',
    parentPath: '/admin/orders',
    keywords: ['status', 'state', ]
  },
  {
    id: 'order-customer',
    type: 'field',
    path: '/admin/orders',
    title: 'Customer',
    titleBg: '',
    parentPath: '/admin/orders',
    keywords: ['customer', 'client', ]
  },
  {
    id: 'order-total',
    type: 'field',
    path: '/admin/orders',
    title: 'Total',
    titleBg: '',
    parentPath: '/admin/orders',
    keywords: ['total', 'amount', ]
  },
  {
    id: 'order-date',
    type: 'field',
    path: '/admin/orders',
    title: 'Date',
    titleBg: '',
    parentPath: '/admin/orders',
    keywords: ['date', 'created', ]
  }
];
