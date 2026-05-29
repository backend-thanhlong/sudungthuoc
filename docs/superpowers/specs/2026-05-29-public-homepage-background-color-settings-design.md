# Public Homepage Background Color Settings Design

## Context

Trang chu public `/` hien dang render dashboard cong khai cho nguoi chua dang nhap va nguoi da dang nhap. Mau nen ngoai cung dang duoc hard-code trong `src/app/page.tsx` bang `#FFCC33`.

Admin can mot cach doi mau nen Trang chu public ma khong can sua source code. He thong da co pattern luu cau hinh toan he thong trong bang `system_settings`, vi du:

- `system_maintenance` cho che do bao tri.
- `chart_color_settings` cho cau hinh mau bieu do.

## Goal

Them chuc nang trong trang **Cai dat he thong** de admin nhap ma mau nen Trang chu public, vi du `#FFCC33`, bam **Luu**, va Trang chu public su dung mau moi.

## Non-Goals

- Khong doi mau dashboard noi bo `/dashboard/*`.
- Khong mo them route public moi.
- Khong them migration database neu co the dung `system_settings`.
- Khong cho user khong phai ADMIN thay doi cau hinh.
- Khong tao theme builder phuc tap; chi quan tri 1 ma mau nen.

## Chosen Approach

Luu mau nen Trang chu public vao `system_settings` voi key moi:

```txt
public_homepage_background_color
```

Gia tri luu:

```json
{
  "backgroundColor": "#FFCC33"
}
```

Ly do:

- Phu hop pattern hien co cua system settings.
- Khong can thay doi schema.
- Admin co the doi mau truc tiep trong UI.
- Trang chu public doc setting server-side, nen mau moi co hieu luc sau request tiep theo.

## Admin UI

Them mot card moi trong `src/app/dashboard/admin/system-maintenance/page.tsx`.

Card title:

```txt
Mau nen Trang chu public
```

Thanh phan:

- Input `type="color"` de chon mau truc quan.
- Input text font mono de nhap ma mau, vi du `#FFCC33`.
- Preview swatch nho hien thi mau dang nhap.
- Nut `Luu`.
- Nut `Tai lai`.
- Text trang thai lan cap nhat gan nhat neu API tra ve `updatedAt`.

Validation tren client:

- Chap nhan hex 6 ky tu dang `#RRGGBB`.
- Tu dong uppercase khi luu.
- Neu sai dinh dang, disable nut `Luu` va hien loi ngan.

## API Design

Them route:

```txt
src/app/api/admin/public-homepage-settings/route.ts
```

`GET`:

- Yeu cau ADMIN.
- Tra ve mau hien tai, default, updatedAt, updatedById.

Response:

```ts
{
  settings: {
    backgroundColor: string;
  };
  defaults: {
    backgroundColor: "#FFCC33";
  };
  updatedAt: string | null;
  updatedById: string | null;
}
```

`PUT`:

- Yeu cau ADMIN.
- Body:

```ts
{
  backgroundColor: string;
}
```

- Validate `backgroundColor` bang regex `^#[0-9A-Fa-f]{6}$`.
- Normalize thanh uppercase.
- Luu vao `system_settings`.
- Ghi activity log action `PUBLIC_HOMEPAGE_BACKGROUND_UPDATED`.
- Tra ve settings moi.

Neu input sai, tra `400` voi message:

```txt
Ma mau nen Trang chu khong hop le
```

## Server Helper

Them file:

```txt
src/lib/public-homepage-settings.ts
```

Exports:

- `PUBLIC_HOMEPAGE_BACKGROUND_SETTING_KEY`
- `DEFAULT_PUBLIC_HOMEPAGE_BACKGROUND_COLOR`
- `normalizeHexColor`
- `getPublicHomepageSettings`
- `savePublicHomepageSettings`

Helper doc `system_settings` bang raw SQL tuong tu `src/lib/system-maintenance.ts` va fallback an toan neu bang setting chua co:

```ts
{
  backgroundColor: "#FFCC33",
  updatedAt: null,
  updatedById: null,
}
```

## Public Homepage Behavior

`src/app/page.tsx` se goi `getPublicHomepageSettings()` server-side.

Main wrapper dung style inline:

```tsx
<main
  className="min-h-screen text-foreground"
  style={{ backgroundColor: homepageSettings.backgroundColor }}
>
```

Dung inline style vi mau do admin nhap runtime, khong nen tao class Tailwind dong nhu `bg-[${color}]`.

Neu doc setting loi do bang thieu, helper fallback `#FFCC33`. Neu loi khac, trang nen throw de loi server duoc ghi nhan thay vi im lang che dau su co database.

## Activity Log

Khi admin luu mau moi, ghi log:

```ts
{
  action: "PUBLIC_HOMEPAGE_BACKGROUND_UPDATED",
  entityType: "system_setting",
  details: {
    backgroundColor: "#FFCC33"
  }
}
```

Neu `ACTIONS` hoac `ENTITY_TYPES` khong co constant phu hop, co the dung string literal nhu route chart colors hien tai dang lam cho `CHART_COLOR_SETTINGS_UPDATED`.

## Testing

Chay:

```bash
npm run lint
```

Kiem tra thu cong:

1. Admin vao `/dashboard/admin/system-maintenance`.
2. Nhap `#FFCC33`, bam `Luu`.
3. Mo `/`, xac nhan nen ngoai cung dung mau `#FFCC33`.
4. Nhap ma sai nhu `FFCC33` hoac `#XYZXYZ`, xac nhan UI/API tu choi.
5. Dang nhap bang role khong phai ADMIN, goi API admin bi tu choi.

## Rollback

Neu can rollback logic runtime, xoa hoac bo qua setting `public_homepage_background_color`; Trang chu public fallback ve `#FFCC33`.
