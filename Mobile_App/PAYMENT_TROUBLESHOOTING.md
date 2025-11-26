# Payment Troubleshooting Guide

## Issue: "Failed to create invoice payment intent" Error

### Root Cause
The error occurs when the buyer tries to pay an invoice using Stripe. This is typically caused by:
1. Backend server not running
2. Network connectivity issues
3. Invalid Stripe API keys
4. Invoice not found or authorization issues

### What I've Fixed

#### Added Detailed Logging
Enhanced `paymentController.js` with comprehensive console logs to track:
- When the endpoint is called
- Invoice lookup and validation
- Authorization checks
- Payment intent creation steps
- Any errors with full stack traces

This will help identify exactly where the payment flow fails.

### How to Test

#### 1. Start the Backend Server
```bash
cd /home/ubaid/Data/FYP/FYP_II_100%/Code/Mobile_App/server
npm start
```

**Expected output:**
```
✅ Server running on port 5000
✅ Database connected successfully
```

#### 2. Verify Stripe Configuration
Check that `.env` file has valid keys:
```bash
cat /home/ubaid/Data/FYP/FYP_II_100%/Code/Mobile_App/server/.env | grep STRIPE
```

**Should show:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### 3. Test the Endpoint Directly
```bash
# Replace with actual invoice ID and auth token
curl -X POST http://localhost:5000/api/payments/invoices/YOUR_INVOICE_ID/create-payment-intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected success response:**
```json
{
  "success": true,
  "clientSecret": "pi_xxxxx_secret_xxxxx"
}
```

#### 4. Check Backend Logs
When the buyer clicks "Pay Invoice", watch the backend terminal for logs:
```
createInvoicePaymentIntent called for invoiceId: 692695f9f30c4d05fc02d7cc userId: ...
Invoice found: { id: ..., buyer: ..., status: 'sent', totalAmount: 5718216 }
Creating payment intent for amount: 571821600 cents
Payment intent created successfully: pi_xxxxx
Returning client secret to frontend
```

### Common Issues and Solutions

#### Issue 1: Backend Not Running
**Symptom:** Network error or "Failed to connect"
**Solution:**
```bash
# Kill any process on port 5000
lsof -ti:5000 | xargs kill -9

# Start server
cd /home/ubaid/Data/FYP/FYP_II_100%/Code/Mobile_App/server
npm start
```

#### Issue 2: Wrong API URL
**Symptom:** 404 Not Found
**Check:** Frontend API configuration in `Frontend/src/config/api.ts`
```typescript
// Development URL should match your backend
development: 'https://m1p2hrxd-5000.asse.devtunnels.ms/api'
// OR if testing locally
development: 'http://localhost:5000/api'
```

**For Local Testing:**
Update `Frontend/.env`:
```
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:5000/api
```

#### Issue 3: Invoice Not Found
**Symptom:** Backend logs show "Invoice not found"
**Solution:** Verify invoice exists in database
```bash
# MongoDB Atlas or local MongoDB
# Check if invoice with that ID exists
```

#### Issue 4: Authorization Failed
**Symptom:** Backend logs show "Authorization failed"
**Cause:** The logged-in user is not the buyer of the invoice
**Solution:** Make sure you're logged in as the buyer who received the invoice

#### Issue 5: Stripe API Key Invalid
**Symptom:** Stripe API error in backend logs
**Solution:** Verify keys are test keys (start with `sk_test_` and `pk_test_`)
- Get keys from: https://dashboard.stripe.com/test/apikeys

### Frontend Error Handling
The error message "Failed to create invoice payment intent" is caught here:
```typescript
// Frontend/app/HomeScreens/ChatMessage.tsx:200
const response = await apiService.payments.createInvoicePaymentIntent(invoiceId);
if (!response.success) {
  throw new Error(response.error || 'Failed to initialize payment');
}
```

The actual error from backend is in `response.error`. Check the frontend console for more details.

### Step-by-Step Payment Flow

1. **Buyer clicks "Pay Invoice"**
   - Frontend: `ChatMessage.tsx` → `handlePayInvoice()`
   
2. **Create Payment Intent**
   - Frontend calls: `POST /api/payments/invoices/:invoiceId/create-payment-intent`
   - Backend: `paymentController.js` → `createInvoicePaymentIntent()`
   
3. **Stripe Creates Payment Intent**
   - Backend calls Stripe API
   - Returns `client_secret` to frontend
   
4. **Show Stripe Payment Sheet**
   - Frontend uses `@stripe/stripe-react-native`
   - Shows payment form with credit card fields
   
5. **Buyer Enters Card Details**
   - Test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   
6. **Process Payment**
   - Stripe confirms payment
   - Webhook notifies backend (or manual process endpoint)
   - Backend creates Order and marks Invoice as paid

### Testing with Stripe Test Cards

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
```

**Declined Card:**
```
Card: 4000 0000 0000 0002
```

**Requires Authentication (3D Secure):**
```
Card: 4000 0025 0000 3155
```

### Network Configuration

#### Using DevTunnel (Current Setup)
Your frontend is configured to use: `https://m1p2hrxd-5000.asse.devtunnels.ms/api`

To update DevTunnel:
```bash
# In VS Code terminal
devtunnel port create 5000
devtunnel access create
```

#### Using Expo Tunnel
```bash
cd /home/ubaid/Data/FYP/FYP_II_100%/Code/Mobile_App/Frontend
npx expo start --tunnel
```

#### Using Local Network
Find your local IP:
```bash
hostname -I | awk '{print $1}'
```

Update frontend `.env`:
```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.X:5000/api
```

### Verification Checklist

Before testing payment:
- [ ] Backend server is running on port 5000
- [ ] MongoDB connection is successful
- [ ] Stripe keys are configured in `.env`
- [ ] Frontend API URL matches backend URL
- [ ] User is logged in as the buyer
- [ ] Invoice exists and status is 'sent'
- [ ] Invoice totalAmount is valid (not 0 or negative)

### Quick Test Script

Run this to check if everything is configured:
```bash
# Check if backend is running
curl http://localhost:5000/api/payments/publishable-key

# Should return:
# {"success":true,"publishableKey":"pk_test_..."}
```

### Next Steps After Fix

1. **Restart Backend:**
   ```bash
   cd /home/ubaid/Data/FYP/FYP_II_100%/Code/Mobile_App/server
   npm start
   ```

2. **Test Payment Flow:**
   - Login as buyer
   - Navigate to chat with vendor
   - Find invoice message
   - Click "Pay Invoice"
   - Watch backend logs for detailed output

3. **Check Logs:**
   - Backend terminal shows all steps
   - Frontend console shows API responses
   - Identify exact failure point

4. **Report Issue:**
   If still failing, provide:
   - Backend console logs
   - Frontend error message
   - Invoice ID
   - User ID (buyer)

## Summary

The payment endpoint is correctly configured with:
- ✅ Route registered: `POST /api/payments/invoices/:invoiceId/create-payment-intent`
- ✅ Authentication middleware: `protect`
- ✅ Stripe integration with test keys
- ✅ Enhanced logging for debugging

The issue is most likely:
1. **Backend not running** - Start with `npm start`
2. **Network mismatch** - Ensure frontend API URL matches backend
3. **Auth token expired** - Re-login if needed

With the added logging, you'll now see exactly where the payment flow fails.
