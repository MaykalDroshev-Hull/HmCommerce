export interface AliExpressVariant {
  skuId: string;
  skuCode?: string;
  price: number; // in GBP
  originalPrice?: number;
  currency: string;
  stock: number;
  properties: Array<{
    name: string;
    value: string;
    imageUrl?: string;
  }>;
  imageUrl?: string;
}

export interface AliExpressProductDetails {
  productId: string;
  title: string;
  description: string;
  images: string[];
  variants: AliExpressVariant[];
  properties: Record<string, string[]>;
  categoryName?: string;
  priceMin: number;
  priceMax: number;
  originalPrice?: number;
  currency: string;
  sourceUrl: string;
}

export interface StagedProductImportPayload {
  aliexpressProductId: string;
  aliexpressProductUrl: string;
  name: string;
  description: string;
  rfproducttypeid: number;
  producttypeid: string;
  sellingPrice: number;
  compareAtPrice?: number | null;
  images: string[];
  selectedVariants: Array<{
    skuId: string;
    sku?: string;
    price: number;
    compareAtPrice?: number | null;
    quantity: number;
    size?: string;
    colour?: string;
    imageUrl?: string;
  }>;
  promodiscountpercent?: number | null;
}

export interface DropshipOrderFulfillmentRequest {
  orderId: string;
  aliexpressProductId: string;
  items: Array<{
    aliexpressSkuId: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    region?: string;
    postcode: string;
    country: string; // 'GB'
    phone?: string;
  };
}
