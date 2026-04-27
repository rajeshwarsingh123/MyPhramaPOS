# Task 9 — Admin Users Enhanced Controls

**Date**: 2025-07-22
**Author**: Agent (Task ID: 9)

---

### Summary
Enhanced the Admin Users page with additional user control features: Reset Password, Ban/Unban User, Set Usage Limits. Added 3 new API routes and significantly extended the admin-users.tsx component with new dialogs, enhanced actions column with tooltips and dropdown menu, and account controls in the view dialog.

### Files Created

#### API Routes (3 files)
1. **`src/app/api/admin/tenants/[id]/reset-password/route.ts`** — PUT:
   - Resets a tenant's passwordHash (plain text for demo)
   - Validates newPassword is at least 6 characters
   - Creates SystemLog entry: "Password reset by admin"
   - Returns: `{ success: true, message: "Password reset successfully" }`

2. **`src/app/api/admin/tenants/[id]/ban/route.ts`** — PUT:
   - Ban or unban a tenant via `{ banned: boolean, reason?: string }`
   - Ban: sets status to 'suspended', stores reason in system log
   - Unban: sets status to 'active'
   - Creates SystemLog entry with details
   - Returns: `{ success: true, status: string }`

3. **`src/app/api/admin/tenants/[id]/limits/route.ts`** — GET/PUT:
   - GET: Fetches tenant limits from PlatformSetting table (key: `tenant_limits_{tenantId}`)
   - PUT: Upserts usage limits as JSON string in PlatformSetting
   - Fields: maxMedicines, maxBillsPerDay, maxStaffUsers, featuresDisabled[]
   - Creates SystemLog entry on update
   - Returns: `{ success: true, limits: {...} }`

### Files Modified

4. **`src/components/admin/admin-users.tsx`** — Major enhancement (~1280 lines):

**New Dialogs:**
- **Reset Password Dialog**: Shows user avatar/name/email, new password field with show/hide toggle, confirm password field, password strength indicator (Too short/Weak/Medium/Strong with colored progress bar), amber "Reset Password" button
- **Ban/Unban Dialog**: 
  - Ban mode: Red warning banner, user info card, required reason textarea, red "Ban User" button
  - Unban mode: Confirmation message, emerald "Activate User" button
- **User Limits Dialog**: 
  - Fetches current limits from API on open
  - Editable fields: Max Medicines, Max Bills Per Day, Max Staff Users
  - Multi-select checkboxes for disabled features (AI Scan, Export Reports, Bulk Import, Custom Branding, API Access)
  - Strikethrough styling for disabled features
  - Loading skeleton while fetching

**Enhanced View Dialog:**
- Status colored dot indicator next to status badge
- Last Activity section showing latest system log entry with timestamp
- Account Controls card at bottom with quick action buttons (Reset Password, Set Limits, Ban/Unban)
- Action buttons close view dialog and open respective dialogs

**Enhanced Actions Column:**
- View (Eye icon) with tooltip
- Edit (Pencil icon) with tooltip
- Reset Password (KeyRound icon, amber hover) with tooltip
- Ban/Unban (ShieldAlert/Unban icon, conditional color) with tooltip
- More dropdown (MoreHorizontal icon) containing all actions plus:
  - Set Limits (SlidersHorizontal icon, blue)
  - Suspend/Activate (existing toggle)
  - Delete User (Trash2 icon, red)

**Mutations:**
- `resetPasswordMutation`: PUT to /reset-password with validation
- `banMutation`: PUT to /ban with reason
- `limitsMutation`: PUT to /limits with all limit fields

**Design Consistency:**
- All dialogs use: `bg-[oklch(0.18_0.02_250)]` background, `border-[oklch(0.28_0.03_250)]` border
- Input fields: `bg-[oklch(0.14_0.02_250)]` background, `border-[oklch(0.28_0.03_250)]` border
- Destructive actions: red-600, Warning actions: amber-600, Activate: emerald-600
- TooltipProvider with delayDuration={300} for hover tooltips
- Loading states with Loader2 spinner on all mutation buttons
- Toast notifications for all actions (success/error)

### Tech Stack Used
- Next.js 16 App Router (API Routes with async params)
- Prisma ORM (SQLite) — PlatformSetting upsert, SystemLog create
- TanStack Query (useQuery, useMutation, useQueryClient)
- shadcn/ui: Dialog, Input, Label, Textarea, Checkbox, Badge, Button, Card, DropdownMenu, Tooltip, Skeleton
- lucide-react: KeyRound, ShieldAlert, Unban, SlidersHorizontal, MoreHorizontal, EyeOff, Loader2, Activity, ShieldCheck
- sonner for toast notifications
- useCallback for memoized handlers

### Verification
- ESLint passes with zero errors
- Dev server compiles successfully (✓ Compiled)
- All 3 API routes follow existing patterns (async params, error handling)
- All existing functionality preserved (search, filter, pagination, view, edit, delete, suspend)
