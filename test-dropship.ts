import { getStoredAliExpressToken } from './lib/aliexpress/auth';
import { createDropshipOrder } from './lib/aliexpress/client';
import { logger } from './lib/logger';

async function test() {
  const token = await getStoredAliExpressToken();
  if (!token) {
    console.log('No token');
    return;
  }
  const result = await createDropshipOrder(
    {
      orderId: 'test-order-123',
      aliexpressProductId: '1005007352317135',
      items: [{ aliexpressSkuId: '14:200004889', quantity: 1, price: 10.99 }],
      shippingAddress: {
        fullName: 'Test User',
        addressLine1: '123 Test St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'GB'
      }
    },
    token
  );
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);
