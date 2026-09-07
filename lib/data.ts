// Legacy Product interface for frontend compatibility
// This will be gradually replaced with the new schema
export interface Product {
  id: string | number; // UUID from Supabase (string) or temporary number for new products
  name?: string;
  category: 'clothes' | 'shoes' | 'accessories';
  brand: string;
  model: string;
  type?: string;
  color: string;
  size?: string;
  quantity: number;
  price: number;
  visible: boolean;
  images: string[];
  description?: string;
  subtitle?: string; // Product subtitle (e.g., "Close fit", "Loose fit")
  isfeatured?: boolean; // Whether the product is featured on the home page
  /** When true, product is hidden from the shop (admin only). */
  isdisabled?: boolean;
  /** When true, product is shown greyed out as out of stock / awaiting restock. */
  awaitingrestock?: boolean;
  /** Percentage discount for PROMOTION (e.g. 20 = 20% off). Null/0 = none. */
  promodiscountpercent?: number | null;
  // New fields for product type system
  productTypeID?: string;
  propertyValues?: Record<string, string | string[]>; // property name -> value(s) mapping
  variants?: any[]; // Product variants from database
  Variants?: any[]; // Product variants from database (alternative naming)
  Images?: any[]; // Product images from database (alternative naming)
  productid?: string; // Product ID from database (alternative naming)
}

export const initialProducts: Product[] = [
  {
    id: 1,
    category: 'clothes',
    brand: 'Zara',
    model: 'Linen Shirt',
    type: 'Shirt',
    color: 'Navy',
    size: 'M',
    quantity: 12,
    price: 39.90,
    visible: true,
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400']
  },
  {
    id: 2,
    category: 'shoes',
    brand: 'Nike',
    model: 'Air Max 90',
    color: 'White',
    size: '42',
    quantity: 5,
    price: 129.90,
    visible: true,
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400']
  },
  {
    id: 3,
    category: 'accessories',
    brand: 'Fossil',
    model: 'Leather Belt',
    type: 'Belt',
    color: 'Brown',
    quantity: 8,
    price: 49.90,
    visible: true,
    images: ['https://images.unsplash.com/photo-1624222247344-52e2f7c88e0d?w=400']
  },
  {
    id: 4,
    category: 'clothes',
    brand: 'MB-Paws',
    model: 'Cotton T-Shirt',
    type: 'T-Shirt',
    color: 'Black',
    size: 'L',
    quantity: 20,
    price: 19.90,
    visible: true,
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400']
  },
  {
    id: 5,
    category: 'shoes',
    brand: 'Adidas',
    model: 'Stan Smith',
    color: 'Green',
    size: '40',
    quantity: 3,
    price: 89.90,
    visible: false,
    images: ['https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=400']
  },
  {
    id: 6,
    category: 'accessories',
    brand: 'Ray-Ban',
    model: 'Aviator Sunglasses',
    type: 'Sunglasses',
    color: 'Gold',
    quantity: 6,
    price: 159.90,
    visible: true,
    images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400']
  }
];

