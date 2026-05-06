# Login Session Idle Timeout Design

## Context

Ung dung dang dung Next.js 16 va NextAuth v5 beta voi JWT session. Cau hinh hien tai trong `src/auth.config.ts` chi dat `strategy: "jwt"` va chua dat `maxAge`, nen thoi han session dang theo mac dinh cua Auth.js la 30 ngay.

Nguoi dung muon phien dang nhap het han sau 4 gio khong thao tac. Neu nguoi dung van dang thao tac trong he thong thi phien phai duoc gia han.

## Goal

- Session het han sau 4 gio khong co hoat dong nguoi dung.
- Khi nguoi dung van thao tac tren giao dien, session duoc lam moi de tiep tuc su dung.
- Cau hinh thoi gian tap trung, de dieu chinh hoac test voi thoi gian ngan hon.
- Khong doi role routing, login flow, schema Prisma, hay chien luoc session hien co.

## Non-Goals

- Khong chuyen sang database session trong dot nay.
- Khong them giao dien canh bao sap het han.
- Khong them bang quan ly session hoac chuc nang thu hoi tung phien.
- Khong thay doi co che kiem tra user active da co trong `src/lib/server-authz.ts`.

## Approach Options

### Option 1: Chi dat `session.maxAge`

Dat `session.maxAge = 4 * 60 * 60` trong `src/auth.config.ts`.

Uu diem:

- Rat nho gon.
- It file bi anh huong.

Nhuoc diem:

- Chua dam bao dung nghia "dang dung thi gia han" trong SPA, vi nguoi dung co the thao tac tren client ma khong tao request lam moi session.

### Option 2: JWT 4 gio + client activity refresh

Dat `session.maxAge = 4 * 60 * 60`, dong thoi them client-side activity refresher trong `SessionProviderWrapper`. Refresher lang nghe hoat dong nguoi dung va goi refresh session co throttle.

Uu diem:

- Dung voi yeu cau idle timeout: khong thao tac thi khong refresh, dang thao tac thi duoc gia han.
- Giu NextAuth JWT strategy hien co.
- Thay doi tap trung o auth config va provider wrapper.
- Khong can migration database.

Nhuoc diem:

- Them mot client component behavior can test ky tren tab focus/visibility.
- Phien chi duoc gia han khi browser co request refresh thanh cong.

### Option 3: Database session

Chuyen sang database session de quan ly thoi han va thu hoi phien tren server.

Uu diem:

- Kiem soat tot hon neu sau nay can xem danh sach session hoac thu hoi tung phien.

Nhuoc diem:

- Can adapter, schema/migration va blast radius lon hon.
- Vuot qua nhu cau 4 gio idle timeout hien tai.

## Recommendation

Chon Option 2.

Phuong an nay dap ung dung yeu cau 4 gio khong thao tac thi het han, con dang thao tac thi gia han, trong khi van giu kien truc NextAuth JWT hien tai va khong can doi database.

## Configuration Design

Them helper nho trong `src/auth.config.ts` de doc thoi gian timeout:

- bien moi: `AUTH_SESSION_IDLE_TIMEOUT_SECONDS`
- gia tri mac dinh: `14400` giay, tuong duong 4 gio
- neu env rong, khong hop le, hoac nho hon 60 giay thi fallback ve `14400`

Cap nhat cau hinh NextAuth:

```ts
session: {
    strategy: "jwt",
    maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
},
jwt: {
    maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
},
```

`session.maxAge` quyet dinh thoi han cookie session va payload session. `jwt.maxAge` duoc dat cung gia tri de tranh lech giua expiry cua JWT va cookie.

## Client Activity Refresh Design

Cap nhat `src/components/SessionProviderWrapper.tsx` de wrap `SessionProvider` bang mot component client-side nho, vi day la diem tap trung cho toan bo dashboard client.

Behavior:

- Lang nghe cac event the hien hoat dong:
  - `pointerdown`
  - `keydown`
  - `touchstart`
  - `focus`
  - `visibilitychange` khi document tro lai visible
- Khi co hoat dong, goi endpoint session cua NextAuth de lam moi session.
- Dung throttle de tranh goi lien tuc; mac dinh de xuat 5 phut mot lan.
- Neu refresh that bai do khong con session hop le, dieu huong ve `/login?reauth=1`.
- Neu network loi tam thoi, khong dang xuat ngay; request protected tiep theo van bi guard server xu ly neu session het han that.

Tham so de xuat:

- `SESSION_REFRESH_THROTTLE_MS = 5 * 60 * 1000`
- refresh ngay khi tab quay lai foreground neu lan refresh cuoi da qua throttle.

## Data Flow

1. Nguoi dung dang nhap bang credentials.
2. NextAuth tao JWT va cookie co thoi han 4 gio.
3. Trong dashboard, `SessionProviderWrapper` khoi tao session client.
4. Khi nguoi dung thao tac sau nguong throttle, client goi refresh session.
5. NextAuth doc JWT con hop le, cap lai cookie voi expiry moi theo `maxAge`.
6. Neu nguoi dung khong thao tac trong 4 gio, cookie/JWT het han.
7. Request tiep theo vao dashboard hoac API protected se bi middleware/server auth chan va dua ve login hoac tra 401.

## Error Handling

- Env timeout khong hop le: fallback ve 4 gio.
- Refresh session tra ve khong authenticated: redirect `/login?reauth=1`.
- Refresh session bi loi network: im lang, khong tao loop redirect; lan request tiep theo cua app se xu ly theo auth guard.
- Tab hidden: khong refresh nen khong keo dai session neu nguoi dung khong that su quay lai dung app.

## Compatibility

- Khong thay doi payload session user hien co: `id`, `role`, `facilityCode`, `companyId`.
- Middleware tiep tuc dung `authConfig`, nen dashboard routing tu dong nhan timeout moi.
- API routes dang goi `auth()` tiep tuc hoat dong nhu cu; khi session het han, chung se nhan session null va tra 401/redirect theo logic hien co.
- Logout thu cong van dung `signOut({ callbackUrl: "/login" })`.

## Security Notes

- Idle timeout 4 gio giam rui ro may bi bo quen so voi mac dinh 30 ngay.
- Client refresh chi gia han khi JWT hien tai con hop le; no khong the khoi phuc session da het han.
- Session van la JWT stateless, nen viec user bi khoa/doi role tiep tuc duoc xu ly boi cac guard server-side da re-check DB trong nhung khu vuc da harden.

## Testing Plan

Kiem tra cau hinh:

1. Dat `AUTH_SESSION_IDLE_TIMEOUT_SECONDS=120` o local de test nhanh.
2. Dang nhap, dung app trong dashboard va xac nhan session van con sau hon 2 phut neu co thao tac dinh ky.
3. Dang nhap lai, khong thao tac qua 2 phut, sau do reload dashboard va xac nhan bi dua ve login.
4. Kiem tra Network tab de xac nhan refresh khong goi lien tuc, chi goi sau nguong throttle.
5. Chay `npm run lint`.

Kiem tra hoi quy:

1. Admin, Facility, Company van redirect dung dashboard theo role.
2. Logout thu cong van ve `/login`.
3. API protected tra 401 khi cookie het han.
4. Tab an trong nen khong gia han session cho toi khi nguoi dung quay lai va session con hop le.

## Implementation Scope

File du kien thay doi:

- `src/auth.config.ts`
- `src/components/SessionProviderWrapper.tsx`
- `.env.docker.example`

Co the cap nhat them `.env`/`.env.docker` neu muon cau hinh ro rang trong moi truong hien tai, nhung khong bat buoc vi code co fallback 4 gio.
