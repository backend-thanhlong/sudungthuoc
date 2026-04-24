# Drug Order QR Scanner Design

## Context

The existing `Tra cuu QR don` page at `/dashboard/dutru-dat-hang/tra-cuu` already supports two lookup modes:

- QR/deep-link lookup through `?t=<token>`
- Manual lookup through `orderNo`

The page is server-rendered and keeps the important security behavior in one place: the user must be signed in, the QR token is verified server-side, and authorization is checked against the actual `DrugOrder`.

The missing user workflow is scanning the printed or on-screen QR directly from this lookup page.

## Goal

Add browser QR scanning to the `Tra cuu QR don` item so users can open the lookup page, tap `Quet QR`, scan a QR code with the device camera, and land on the existing lookup result without changing the server-side lookup contract.

## Scope

Included:

- Add a camera scanner entry point on `/dashboard/dutru-dat-hang/tra-cuu`
- Use a QR scanning package, selected as the preferred approach
- Keep manual `Ma don` lookup available
- Accept QR values that contain:
  - an absolute URL to `/dashboard/dutru-dat-hang/tra-cuu?t=<token>`
  - an internal path `/dashboard/dutru-dat-hang/tra-cuu?t=<token>`
  - a raw token value
- Stop the camera when the scanner dialog closes or after a successful scan
- Show clear client-side errors for camera access failure or invalid QR content

Not included:

- Changing QR token format
- Changing lookup authorization rules
- Adding scan audit logs
- Adding public unauthenticated lookup
- Adding a separate scan route

## Approach Options

### Option 1: Scanner Dialog On The Existing Lookup Page

Add a `Quet QR` button beside the current manual lookup form. The button opens a dialog, starts the camera, scans the QR, normalizes the result, then routes to the existing lookup URL.

Pros:

- Minimal routing and layout changes
- Camera only runs after explicit user action
- Works well on mobile and desktop browsers with cameras
- Keeps current manual fallback visible

Cons:

- Adds a client component to an otherwise server-first page

### Option 2: Inline Scanner Inside The Lookup Card

Render the camera preview directly under the form.

Pros:

- One fewer click for users who only scan QR codes

Cons:

- Takes space on a lookup page that also needs manual input and results
- Camera lifecycle is easier to mishandle when navigating between states

### Option 3: Dedicated Scanner Route

Create a separate route for camera scanning and redirect back to the lookup page after scan.

Pros:

- Clean separation between scan and result views

Cons:

- Adds navigation overhead and a new route for a small workflow

## Decision

Use Option 1: scanner dialog on the existing lookup page.

The scanner should use a dedicated QR scanning package, with `@zxing/browser` as the target dependency unless implementation proves it incompatible with the current Next.js/React stack. This keeps browser support better than relying only on native `BarcodeDetector`.

## User Flow

1. User opens `Tra cuu QR don`.
2. User can either type `Ma don` as today or select `Quet QR`.
3. Selecting `Quet QR` opens a dialog and requests camera permission.
4. The scanner decodes the first valid QR value.
5. The client normalizes the scanned value:
   - absolute app URL: use its `t` query param
   - internal lookup path: use its `t` query param
   - raw token: treat the scanned value as `t`
6. The client navigates to `/dashboard/dutru-dat-hang/tra-cuu?t=<token>`.
7. The existing server page verifies the token, checks permission, and renders the lookup result.

## Component Design

Add a client component:

- `src/components/drug-orders/DrugOrderQrScannerDialog.tsx`

Responsibilities:

- Render the `Quet QR` button and dialog
- Start the camera when the dialog opens
- Decode QR frames through the scanner package
- Normalize the decoded QR text into a lookup path
- Navigate with `useRouter().push(...)`
- Stop camera tracks and reset scanner state when closed
- Surface short errors:
  - cannot access camera
  - no camera found
  - QR content is not a valid order lookup QR

The server page remains responsible for:

- Session requirement
- QR token verification
- Role authorization
- Loading and rendering lookup data

## Data And Security

The scanner is only a client-side input method. It must not trust scanned content beyond extracting the token candidate and passing it to the existing lookup route.

Security behavior remains unchanged:

- Invalid token -> `QR khong hop le hoac da bi thay doi`
- Missing order -> `Khong tim thay don du tru`
- Unauthorized order -> `Ban khong co quyen xem don nay`

Because server-side verification remains the source of truth, accepting raw scanned token text does not weaken the lookup model.

## UI Behavior

The lookup card should keep the existing manual form and add a scanner button with a QR/camera icon. On narrow screens, controls can stack vertically.

The scanner dialog should show:

- a stable video preview area
- a concise status line
- a retry path through closing and reopening the dialog, or by keeping the dialog open after a camera error
- a close button

The dialog should not include operational actions such as responding to an order, creating a shipment, or confirming receipt.

## Error Handling

Client-side scanner errors:

- Permission denied: tell the user the camera cannot be opened and they can still enter `Ma don`
- No camera: tell the user no camera was found
- Invalid QR content: keep the dialog open and show a short invalid QR message

Server-side lookup errors remain handled by the current page state.

## Testing And Verification

Verify with:

- `npm run lint`
- `npx tsc --noEmit`

Manual checks:

- `Quet QR` opens a camera dialog
- Closing the dialog stops the camera indicator
- Scanning a QR URL generated by `DrugOrderQrCode` navigates to the lookup result
- Manual `Ma don` lookup still works
- Invalid QR content shows a client-side error and does not navigate
- Server-side invalid/unauthorized token behavior remains unchanged
