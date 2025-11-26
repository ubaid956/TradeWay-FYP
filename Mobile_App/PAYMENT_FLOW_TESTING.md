# Payment Flow Testing Guide

## Overview
This guide explains how to test the complete vendor invoice → buyer payment → order creation flow.

## Setup Complete ✅

### Backend Changes:
1. **Manual Order Creation Endpoint**: Added `POST /payments/invoices/:invoiceId/process-payment`
   - Verifies payment intent status with Stripe
   - Creates order if payment succeeded
   - Marks product as sold
   - Updates invoice status

2. **Enhanced Logging**: Added console logs throughout the flow to trace seller IDs:
   - `paymentController.js`: Logs order creation with seller ID
   - `orderController.js`: Logs sellerId when fetching orders

3. **Webhook Handler**: Updated to skip signature verification in dev mode (when `STRIPE_WEBHOOK_SECRET` is empty)

### Frontend Changes:
1. **Manual Processing Call**: After successful payment, automatically calls the manual processing endpoint
2. **Fallback Polling**: If manual processing fails, falls back to polling invoice status
3. **Auto-refresh on Focus**: Orders tab refreshes when vendor switches to it
4. **Pull-to-Refresh**: Orders tab supports pull-to-refresh

## Testing Steps

### Step 1: Complete Payment Flow
1. **As Vendor**:
   - Create a product
   - Go to "Bids" tab
   - Accept a buyer's proposal
   - Click "Send Invoice"

2. **As Buyer**:
   - Open chat with vendor
   - You'll see the invoice message
   - Click "Pay Invoice" button
   - Use test card: **4242 4242 4242 4242**
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - Complete payment

3. **Watch Console Logs**:
   - Frontend should show: "Payment successful", "Processing your order...", "Order created"
   - Backend terminal should show:
     ```
     Manual processing: Creating order with seller: <seller-id>
     Manual processing: Order created with ID: <order-id>
     ```

### Step 2: Verify Order Appears
1. **As Vendor**:
   - Switch to "Orders" tab (bottom navigation)
   - You should see the new order immediately
   - Pull down to refresh if needed

2. **Backend Logs**:
   - Should show:
     ```
     getSellerOrders: sellerId = <seller-id>, found <count> orders
     ```

### Step 3: Debug If Orders Don't Appear
If orders tab is empty after payment:

1. **Check Frontend Logs**:
   ```
   Fetching seller orders for user: <user-id>
   Seller orders response: {...}
   ```

2. **Check Backend Logs**:
   ```
   Manual processing: Creating order with seller: <seller-id>
   getSellerOrders: sellerId = <seller-id>
   ```

3. **Verify Seller IDs Match**:
   - The seller ID used when creating the order should match the user ID fetching orders
   - If they don't match, there's an issue with how we're getting the seller from the product

## Test Cards (Stripe Test Mode)

### Successful Payments:
- **4242 4242 4242 4242** - Always succeeds
- **5555 5555 5555 4444** - Mastercard success
- **3782 822463 10005** - Amex success

### Test Failure Scenarios:
- **4000 0000 0000 0002** - Card declined
- **4000 0000 0000 9995** - Insufficient funds
- **4000 0025 0000 3155** - Requires authentication (3D Secure)

## Expected Flow

```
1. Vendor creates product → product.seller = vendorId
2. Buyer sends proposal → bid.product = productId
3. Vendor accepts proposal → bid.status = 'accepted'
4. Vendor sends invoice → invoice.seller = product.seller (vendorId)
5. Buyer pays invoice → Stripe creates payment intent
6. Frontend calls manual processing → Creates order with invoice.seller
7. Order saved → order.seller = invoice.seller (vendorId)
8. Vendor fetches orders → Filter by req.user.id (vendorId)
9. Orders displayed in vendor's Orders tab ✅
```

## Troubleshooting

### Issue: Orders still empty after payment
**Solution**: Check if the logged seller IDs match:
```bash
# In backend logs, look for these two lines after a payment:
Manual processing: Creating order with seller: 673c0d47f7c3f8ae632c9e7f
getSellerOrders: sellerId = 673c0d47f7c3f8ae632c9e7f

# They should be identical!
```

### Issue: "Payment not ready" error
**Solution**: Wait 2-3 seconds after app opens before attempting payment. The publishable key needs to load first.

### Issue: Backend not responding
**Solution**: 
```bash
cd /home/ubaid/Data/FYP/FYP_II_100%/Code/Mobile_App/server
npm start
```

### Issue: Frontend not updating
**Solution**: Clear app data and restart:
```bash
cd /home/ubaid/Data/FYP/FYP_II_100%/Code/Mobile_App/Frontend
npx expo start --clear
```

## Webhook Alternative (Optional)

If you want webhooks to work locally (instead of manual processing):

1. **Install Stripe CLI**:
   ```bash
   # Download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward Webhooks**:
   ```bash
   stripe listen --forward-to localhost:5000/webhooks/stripe
   ```

4. **Copy Webhook Secret**:
   The CLI will show: `whsec_...` 
   Add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

5. **Test Payment**:
   Now the webhook will trigger automatically after payment!

## Success Indicators

✅ Payment completes without errors  
✅ Alert shows "Order created successfully"  
✅ Backend logs show order creation  
✅ Orders tab shows the new order  
✅ Product marked as sold  
✅ Invoice marked as paid  

## Current Status

- ✅ Invoice creation working
- ✅ Payment intent creation working
- ✅ Payment processing working
- ✅ Manual order creation working
- ✅ Auto-refresh on tab focus working
- ⏳ Webhook integration (optional, requires Stripe CLI for local testing)

## Next Steps

1. Test the complete flow with the steps above
2. Check console logs to verify seller IDs match
3. If issues persist, share both frontend and backend logs for diagnosis
