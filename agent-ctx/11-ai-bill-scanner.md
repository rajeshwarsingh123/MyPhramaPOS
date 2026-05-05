# Task 11 — AI Bill Scanner & Purchase Pricing API

**Date**: 2025-07-22
**Author**: Agent (Task ID: 11)

---

### Summary
Built AI-powered features for PharmPOS: an AI Bill Scanner that uses Vision Language Model (VLM) to extract medicine details from supplier bill images, a Pricing Suggestion API, and integrated the scan feature directly into the Purchase Entry page.

### Files Created

#### API Routes (2 files)
1. **`src/app/api/ai/scan-bill/route.ts`** — POST:
   - Accepts FormData with an image/PDF file
   - Validates file type (JPEG, PNG, GIF, WebP, BMP, PDF) and size (max 10MB)
   - Converts file to base64 and sends to VLM via `z-ai-web-dev-sdk`
   - Uses structured prompt requesting JSON array of medicines with: medicine_name, quantity, batch_number, expiry_date, mrp_or_price, gst_percent, company_name
   - Parses VLM response — extracts JSON array from markdown code blocks
   - Returns `{ success: true, items[] }` on success, `{ success: false, raw }` with raw text fallback on parse failure
   - PDF files use `file_url` content type; images use `image_url` content type

2. **`src/app/api/ai/suggest-pricing/route.ts`** — POST:
   - Accepts `{ purchasePrice, marginPercent, gstPercent }`
   - Validates inputs (non-negative numbers, GST 0-28%)
   - Calculates: basePrice = purchasePrice × (1 + margin/100), gstAmount, sellingPrice = basePrice + gst, profitPerUnit
   - Returns full pricing breakdown with rounded values (2 decimal places)

#### Frontend Component (Modified)
3. **`src/components/pages/purchases.tsx`** — Updated with AI scan integration:
   - Added new imports: `useRef`, `Camera`, `ScanLine`, `Upload`, `Sparkles` from lucide-react
   - New `ScannedItem` interface for AI-extracted item data
   - New `ScanBillDialog` component (~350 lines) with:
     - Drag-and-drop file upload zone with visual feedback
     - File picker (accepts image/* and application/pdf)
     - Image preview for uploaded images
     - PDF file info display (no preview)
     - "Scan Bill" button with loading state and spinner animation
     - Animated scanning state (spinning border + sparkle icon)
     - Error state with raw text fallback (collapsible)
     - Results table showing extracted items (medicine, qty, batch, expiry, price)
     - "Add to Purchase" button to inject all extracted items into the form
     - Violet color scheme for AI feature distinction
   - "Scan Bill" button in the Items section header (violet-accented)
   - `handleScannedItems` callback that:
     - Maps scanned items to `PurchaseFormItem` objects
     - Auto-matches medicine names against existing medicines in DB (case-insensitive)
     - Populates batch numbers, expiry dates, quantities, prices, GST %
     - Appends all items to the existing purchase form
   - Dialog controlled by `scanOpen` state, positioned between form and history

### Tech Stack Used
- `z-ai-web-dev-sdk` (VLM) for vision-based OCR on server side
- Next.js 16 App Router (API Routes, FormData handling)
- shadcn/ui: Dialog, Button, Card, Badge, Table, ScrollArea, Separator
- lucide-react icons: Camera, ScanLine, Upload, Sparkles, Loader2, X, Plus
- React hooks: useState, useRef, useCallback
- sonner for toast notifications
- `formatCurrency` helper (₹) for price display

### Design Decisions
- Violet color scheme for AI features to distinguish from standard operations
- Server-side only VLM usage (z-ai-web-dev-sdk in API route, never on client)
- Graceful fallback: if JSON parsing fails, returns raw text so user can manually extract info
- Drag-and-drop + file picker for flexible upload
- Scanning animation provides visual feedback during processing
- Auto-matching scanned medicine names against existing DB records reduces manual entry
- Items added to form (not auto-saved) so user can review and edit before submitting

### Verification
- ESLint passes with zero errors from Task 11 code (only pre-existing error in header.tsx)
- Dev server compiles successfully
- All API routes properly structured with error handling
