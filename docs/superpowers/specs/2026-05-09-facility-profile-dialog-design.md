# Facility Profile Dialog Design

## Context

Facility users can currently change their password from the navbar account menu, but they cannot update their own facility metadata. Admin users can edit facility records from the admin users page. The requested change is to let a facility user click the account/facility icon in the navbar, choose "Cap nhat thong tin co so", and update their own facility information, except for "Ma co so".

The facility metadata lives on the `User` model:

- `facilityName`
- `facilityCode`
- `autonomyGroup`
- `facilityType`
- `contactPerson`
- `phoneNumber`
- `address`
- `latitude`
- `longitude`

## Goals

- Show a "Cap nhat thong tin co so" action in the navbar account dropdown for `FACILITY` users.
- Open an in-place dialog rather than navigating to a separate page.
- Let facility users update only their own allowed metadata fields.
- Keep `facilityCode` visible but read-only.
- Let users fill `latitude` and `longitude` from the browser's current location when they choose that action.
- Refresh the client session/layout after a successful save so the displayed facility name stays current.

## Non-Goals

- Do not let facility users edit `facilityCode`, `username`, `role`, `isActive`, or password fields through this flow.
- Do not change admin user management behavior.
- Do not add approval workflow for facility profile updates in this iteration.

## Chosen Approach

Add a dedicated facility profile API instead of reusing the admin users endpoint. This keeps authorization narrow:

- `GET /api/facility/profile` returns the active facility user's editable profile.
- `PATCH /api/facility/profile` validates the session role and updates only the allowlisted fields.

The navbar owns the open state and renders a reusable `FacilityProfileDialog`, similar to the existing password dialog. The dropdown item is only rendered for `FACILITY` role.

## UI Behavior

The dialog loads current profile values when opened. It shows:

- `Ma co so` as disabled/read-only.
- editable fields for facility name, facility type, autonomy group, contact person, phone number, address, latitude, and longitude.
- a "Chon vi tri hien tai" action that calls the browser Geolocation API and fills latitude/longitude.

On save:

- disable the submit button while saving
- keep save disabled while current-location lookup is still in progress
- show success or error toast
- close the dialog on success
- call `router.refresh()` so the dashboard session rendered by the server layout can pick up a changed facility name

## Validation And Security

Server validation is the source of truth:

- require active `FACILITY` session via `requireActiveSessionUser("FACILITY")`
- accept only the allowed editable fields
- parse `latitude` in range -90 to 90
- parse `longitude` in range -180 to 180
- treat empty strings as `null`
- ignore or reject attempts to change protected fields, with no path that writes `facilityCode`
- handle browser geolocation denial, timeout, unsupported browsers, and unavailable position on the client without saving partial data automatically

## Testing

Run lint/build level checks after implementation. Manually verify the expected code path:

- facility dropdown contains the new action
- dialog opens and loads current data
- `Ma co so` cannot be edited
- choosing current location fills `latitude` and `longitude` when the browser grants permission
- successful update refreshes the navbar/header name
- admin/company dropdowns do not show the facility profile action
