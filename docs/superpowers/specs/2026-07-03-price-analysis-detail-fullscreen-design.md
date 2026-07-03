# Price Analysis Detail Fullscreen Modal Design

## Context

Trang `dashboard/price-analysis` hien bang top thuoc co nhieu muc gia va modal `Xem chi tiet` cho tung thuoc. API `/api/price-analysis` da tra `pricePoints[].nhomTckts`, nhung modal chi tiet chua hien thi nhom TCKT cua tung dong gia.

Modal hien tai gioi han kich thuoc `max-h-[90dvh] max-w-[94vw] sm:max-w-6xl`, nen bang chi tiet nhieu cot can dien tich hon va de bi cuon trong khung nho.

## Goals

- Hien thi nhom TCKT cua thuoc trong modal `Xem chi tiet`.
- Chuyen modal chi tiet gia sang fullscreen de doc bang nhieu cot tot hon.
- Giu nguyen API, logic tinh toan, loc danh sach va bang top thuoc hien co.

## Non-Goals

- Khong thay doi grouping gia, cong thuc chenhlech, hoac dieu kien lay du lieu.
- Khong them chuc nang search, sort, pagination trong modal.
- Khong tach component moi neu thay doi van nho va nam gon trong `PriceAnalysisPage.tsx`.

## Recommended Approach

Sua `src/components/price-analysis/PriceAnalysisPage.tsx`:

1. Doi `DialogContent` cua modal chi tiet sang layout fullscreen:
   - `100dvh` va `100vw`.
   - bo transform center mac dinh bang cac class override co `!`.
   - dung flex column, header co vung rieng, body cuon rieng.
   - bo border radius, border va shadow de modal doc nhu man hinh lam viec.
2. Them cot `Nhom TCKT` vao bang detail:
   - dat gan cot `So QD` va truoc `Gia VAT`.
   - hien `joinValues(point.nhomTckts)`.
   - cho phep wrap/break word de cac gia tri dai khong lam vo layout.
3. Giu cac KPI, canh bao lech don vi tinh va style mau gia min/max hien co.

## Component Behavior

Khi nguoi dung bam `Chi tiet`, modal mo phu toan bo viewport. Header hien tieu de va mo ta thuoc. Body co cac chi so tom tat, thong tin don vi/quy cach, canh bao neu co lech don vi tinh, va bang chi tiet theo co so.

Bang detail hien moi price point gom: don vi, ma noi bo, thuoc noi bo, don vi tinh, cong ty, so QD, nhom TCKT, gia VAT. Neu price point gom nhieu dong map, nhom TCKT duoc noi bang dau phay theo thu tu da sort tu backend.

## Data Flow

Khong thay doi data flow. `loadPriceAnalysisPayload` da select `nhomTckt`, gom vao `nhomTckts`, va serialize trong `pricePoints`. Client type `PricePoint` da co `nhomTckts: string[]`, nen UI chi can render field nay.

## Error Handling

Khong them error path moi. Neu `nhomTckts` rong, UI hien fallback `-` qua `joinValues`. Cac loi fetch payload giu nguyen thong bao hien tai.

## Testing

Can chay kiem tra sau khi implement:

- `npm run lint` neu project co script lint kha dung.
- Kiem tra TypeScript/build script neu co va phu hop voi repo.
- Neu co the chay app, mo `dashboard/price-analysis`, bam `Chi tiet`, xac nhan modal fullscreen va cot `Nhom TCKT` hien dung.

## Risks

- Bang detail co them cot nen can modal fullscreen va overflow ngang/doc on dinh.
- Neu mot price point co nhieu nhom TCKT, text dai can wrap de khong day cot gia VAT ra ngoai.
