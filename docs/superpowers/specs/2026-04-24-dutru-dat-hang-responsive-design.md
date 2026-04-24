# Du Tru Dat Hang Responsive Design

## Context

Module `Du tru dat hang` hien co da ho tro day du nghiep vu cho 3 vai tro:

- co so tao du tru, them thuoc, nhap so luong, gui cong ty, thu hoi, xac nhan thuc nhan
- cong ty xem don, phan hoi tung dong, quan ly danh muc thuoc cong ty, tao dot giao
- admin giam sat don, loc danh sach, xem chi tiet, xem timeline giao nhan, xoa don hop le

Code hien tai da co nen tot cho responsive:

- route va API da tach theo vai tro
- UI chinh nam trong cac component React rieng:
  - [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx)
  - [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx)
  - [AdminDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/AdminDrugOrdersPage.tsx)
  - [FacilityDrugOrderCatalogDialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx)
- nhieu layout da dung Tailwind breakpoints nhu `lg`, `xl`, `md`
- bang da co kha nang scroll ngang qua `Table` wrapper

Nhung trai nghiem mobile hien tai moi dung o muc "co the xem bang cach keo ngang". Cac diem chinh can giai quyet:

- [DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx) dang co sidebar fixed va padding trai co dinh, gay hep noi dung tren mobile/tablet
- nhieu bang dong thuoc va bang danh muc thuoc van uu tien desktop columns
- cac dialog lon tren mobile can thanh full-screen task flow thay vi bang/form rong
- cac tac vu nhap lieu tren mobile can thao tac bang card/list va sticky action thay vi bang ngang

## Goal

Xay dung responsive sau cho module `Du tru dat hang` de dung duoc day du tren dien thoai va tablet, trong khi desktop giu nguyen trai nghiem hien tai o muc toi da.

Thanh cong khi:

- nguoi dung co so co the tao don, them thuoc, nhap so luong, luu/gui, thu hoi, xac nhan thuc nhan tren mobile/tablet
- nguoi dung cong ty co the phan hoi don, tao/cap nhat thuoc cong ty, tao dot giao tren mobile/tablet
- admin co the loc, giam sat, xem chi tiet, xem timeline, xoa don hop le tren mobile/tablet
- desktop van giu layout bang va master-detail hien tai
- khong can thay doi API, database schema, status workflow, hoac business rules

## Scope

Bao gom:

- responsive app shell cho dashboard tren mobile/tablet
- mobile/tablet presentation layer rieng cho 3 man:
  - `/dashboard/facility/dutru-dat-hang`
  - `/dashboard/company/dutru-dat-hang`
  - `/dashboard/admin/dutru-dat-hang`
- mobile/tablet card/list views thay cho bang rong o cac noi can thao tac
- full-screen mobile task flows cho dialog lon
- sticky bottom action bars cho thao tac chinh
- responsive treatment cho QR lookup display va shipment/receipt forms
- regression guard de desktop UI tiep tuc hoat dong nhu hien tai

Khong bao gom:

- doi API endpoints
- doi database schema
- doi status model hoac permission rules
- viet lai nghiep vu dat hang
- tao native mobile app
- thay doi toan bo design system cua dashboard ngoai nhung gi can de module nay dung duoc

## Approach Options

### Option 1: CSS responsive tren component hien tai

Lam:

- them breakpoint classes
- scroll ngang cac bang
- giam padding, resize typography

Uu diem:

- nhanh
- it component moi

Nhuoc diem:

- mobile van la desktop thu nho
- nhap lieu tren bang rong kho thao tac
- khong dat muc "mobile-first sau"

### Option 2: Giu desktop, them mobile/tablet views song song

Lam:

- desktop tiep tuc render bang/layout hien tai
- mobile/tablet render card/list/task flows toi uu cam ung
- dung chung state, handlers, API, validation

Uu diem:

- giam rui ro pha desktop
- trai nghiem mobile tot hon ro
- phu hop voi code hien tai vi data va handlers da tach tuong doi ro
- co the trien khai tung vai tro/tung workflow

Nhuoc diem:

- tang so component UI can bao tri
- can can than de khong duplicate business logic

### Option 3: Tach mobile module rieng

Lam:

- tao route/component mobile gan nhu rieng cho tung vai tro
- toi uu sau theo luong mobile doc lap

Uu diem:

- tu do thiet ke cao nhat

Nhuoc diem:

- de trung logic
- tang chi phi bao tri
- de lech hanh vi desktop/mobile

## Decision

Chon Option 2: giu desktop hien tai, them mobile/tablet views song song.

Ly do:

- yeu cau da chot la desktop van giu nguyen
- module co nhieu nghiep vu can day du tren mobile/tablet
- bang desktop van phu hop cho man hinh lon
- mobile can card/list va task flow rieng de thuc su dung duoc
- API hien tai co the dung chung, khong can tao mobile-specific endpoints

## Breakpoint Strategy

Desktop:

- `xl` tro len giu layout hien tai, gom sidebar, master-detail, bang rong, dialog lon
- `lg` co the van dung desktop UI neu du ngang, nhung can dam bao khong bi sidebar lam vo layout

Tablet:

- tu `md` den duoi `xl`
- uu tien layout section/tab, danh sach va chi tiet khong bat buoc nam canh nhau
- card grid co the dung 2 cot neu du ngang
- action bars va filter panels nen toi uu cam ung

Phone:

- duoi `md`
- mot cot
- khong dung bang rong lam UI chinh cho cac tac vu nhap lieu
- full-screen dialogs/task flows
- bottom action bar cho thao tac chinh
- navigation dashboard la drawer hoac compact top shell, khong la sidebar co dinh

## Shared Layout Design

### Dashboard shell

[DashboardLayout.tsx](/opt/sudungthuoc/sudungthuoc/src/components/DashboardLayout.tsx) can duoc responsive hoa:

- desktop giu sidebar fixed nhu hien tai
- mobile/tablet chuyen sidebar thanh drawer/overlay
- main content dung `pl-0` tren mobile/tablet, giu `pl-64`/`pl-20` tren desktop
- header mobile co nut menu, title ngan, notification, account menu
- main padding responsive:
  - phone: `p-3` hoac `p-4`
  - tablet: `p-4`
  - desktop: giu `p-6`

### Shared responsive primitives

Nen them cac component presentation nho, khong chua business logic:

- order summary card
- order detail section header
- drug order line card
- shipment card
- catalog drug selectable card
- mobile sticky action bar
- responsive filter panel/sheet
- section tabs hoac segmented controls cho mobile/tablet

Nhung component nay nhan props va callback tu page hien tai. Chung khong fetch data rieng va khong quyet dinh permission.

## Facility Workflow

Desktop:

- giu UI hien tai trong [FacilityDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrdersPage.tsx)
- giu layout danh sach trai / chi tiet phai va bang desktop

Mobile/tablet:

### 1. Danh sach don

- render order cards thay vi sidebar list hep
- moi card gom:
  - ma don
  - cong ty
  - status badge
  - so dong thuoc
  - tong so luong
  - ngay cap nhat
  - canh bao so dong cho cong ty xac nhan danh muc
- nut chinh `Them du tru` nam trong sticky bottom action hoac header action

### 2. Chi tiet don

- chi tiet la mot view/section mot cot
- thong tin dau trang gom ma don, cong ty, status, ngay gui, QR
- chia thanh sections:
  - `Tong quan`
  - `Thuoc`
  - `Giao nhan`
  - `Ghi chu`
- action bar duoi man hinh hien theo permission:
  - `Them thuoc`
  - `Luu nhap`
  - `Gui cong ty`
  - `Thu hoi`
  - `Xac nhan thuc nhan`
- khi co qua nhieu action, action phu di vao menu `Them`

### 3. Dong thuoc

- mobile khong dung bang 8 cot lam UI chinh
- moi dong la card:
  - ten thuoc
  - ma thuoc cong ty
  - thuoc chuan lien ket
  - don vi
  - so luong yeu cau
  - goi y so luong va co so goi y ngan
  - trang thai dong
  - ly do cong ty neu co
- neu co quyen sua:
  - input so luong nam trong card
  - nut `Dung goi y`
  - nut `Xoa`
  - validation hien ngay trong card

### 4. Chon thuoc them vao du tru

[FacilityDrugOrderCatalogDialog.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/FacilityDrugOrderCatalogDialog.tsx) hien da full-screen, tiep tuc giu huong nay.

Mobile/tablet can doi noi dung ben trong:

- desktop giu bang `min-w` va sticky columns
- mobile/tablet render selectable cards
- search sticky tren dau
- tabs `Goi y nen them` va `Danh muc cong ty`
- checkbox lon, toan card co the tap de chon
- footer sticky hien so thuoc da chon va nut them
- item bi khoa/da ton tai/trung thuoc chuan hien badge ro tren card

### 5. Xac nhan thuc nhan

- desktop giu dialog hien tai
- mobile/tablet render full-screen hoac tall sheet
- moi dong giao nhan la form card:
  - ten thuoc
  - so giao
  - input thuc nhan
  - input ly do chenh lech
  - validation inline
- footer sticky co `Dong` va `Xac nhan thuc nhan`

## Company Workflow

Desktop:

- giu UI hien tai trong [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx)
- giu tabs, bang dong thuoc, dialog desktop

Mobile/tablet:

### 1. Tabs chinh

- `Don hang` va `Danh muc thuoc` dung segmented control full width
- bo loc don hang la collapsible panel/sheet:
  - search
  - trang thai
  - co so
- danh sach don la card:
  - ma don
  - co so
  - trang thai
  - so dong
  - requested/accepted/shipped
  - canh bao can xac nhan danh muc

### 2. Chi tiet don

- header gom ma don, co so, status, ngay gui, QR
- sections:
  - `Tong quan`
  - `Dong thuoc`
  - `Giao hang`
  - `Lich su`
- phone chuyen sang detail view sau khi chon don
- tablet co the giu split view neu du ngang, nhung khong bat buoc

### 3. Phan hoi dong thuoc

- desktop giu dialog hien tai
- mobile/tablet chuyen thanh full-screen review flow
- moi dong la card co:
  - ten thuoc cong ty hoac ten dong
  - ma thuoc cong ty neu co
  - so luong yeu cau
  - trang thai validation
  - decision control: `Xac nhan du`, `Mot phan`, `Tu choi`
  - input so luong chap nhan khi can
  - input ly do
  - khu chon/tao thuoc cong ty neu dong can xac nhan danh muc
- filter nhanh:
  - `Tat ca`
  - `Cho phan hoi`
  - `Can danh muc`
  - `Loi`
- footer sticky gui phan hoi

### 4. Tao dot giao

- mobile/tablet form theo card:
  - ngay giao tu/den o dau flow
  - ghi chu dot giao
  - moi dong co ten thuoc, so con lai, input so giao ky nay, ly do
- footer sticky `Tao dot giao`
- validation hien ngay tren card bi loi

### 5. Danh muc thuoc cong ty

- desktop giu bang hien tai
- mobile/tablet render catalog cards:
  - ma thuoc cong ty
  - ten thuoc
  - hoat chat
  - thuoc chuan lien ket
  - trang thai dang dung/ngung dung
  - actions sua/xoa neu du dieu kien
- search/filter sticky
- them/sua thuoc cong ty la full-screen form mot cot
- khu tim thuoc chuan hien ket qua bang card list

## Admin Workflow

Desktop:

- giu UI hien tai trong [AdminDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/AdminDrugOrdersPage.tsx)
- giu summary cards, filter card, master-detail, bang giam sat

Mobile/tablet:

### 1. Tong quan giam sat

- metric cards:
  - phone: 1-2 cot tuy noi dung
  - tablet: 2 cot
  - desktop: giu 4 cot
- filter sheet/panel:
  - search
  - co so
  - cong ty
  - trang thai
  - tu ngay
  - den ngay
- nut filter hien so dieu kien dang ap dung

### 2. Danh sach don

- mobile dung order cards:
  - ma don
  - co so
  - cong ty
  - status
  - so dong
  - accepted/received
  - ngay tao
- search dat gan dau danh sach
- phone: tap card mo detail view
- tablet: co the split list/detail neu du rong

### 3. Chi tiet giam sat

- header gom ma don, status, co so, cong ty
- sections:
  - `Thong tin`
  - `Dong thuoc`
  - `Timeline giao nhan`
  - `QR`
- dong thuoc la card:
  - ten thuoc
  - nguon
  - yeu cau
  - chap nhan
  - da giao
  - da nhan
  - status
  - ly do cong ty
- timeline giao nhan la card dot giao, moi dot co list dong giao/nhan thay bang

### 4. Hanh dong quan tri

- `Xoa don` nam trong action menu hoac section nguy hiem
- neu khong du dieu kien xoa, hien warning ngan
- UI khong tu quyet dinh rule xoa; tiep tuc dua vao backend/permission hien co

## Data Flow

Khong thay doi data flow nghiep vu.

Nguon su that van la state hien tai trong tung page component:

- facility page goi API facility hien co
- company page goi API company hien co
- admin page goi API admin hien co

Mobile/tablet views:

- nhan data tu state hien co
- goi lai handler hien co:
  - refresh
  - select order
  - save draft
  - submit
  - recall
  - confirm receipt
  - respond
  - create shipment
  - save catalog
  - delete order
- khong fetch rieng
- khong copy business logic

Neu can tach component de giam kich thuoc file, component moi chi nen nhan props va callbacks. Logic parse payload, validate permission, submit API van o page hoac helper hien co.

## Error Handling And Validation

Giu validation hien co, nhung doi vi tri hien thi tren mobile/tablet:

- loi dong thuoc hien ngay trong card dong thuoc
- loi response line hien trong card phan hoi
- loi shipment line hien trong card tao dot giao
- loi receipt line hien trong card xac nhan thuc nhan
- action bi disabled phai co ly do ngan gan context lien quan
- loading state hien tren nut dang thao tac va section dang load
- toast van dung cho ket qua thanh cong/that bai cap action

Voi sticky bottom action bar:

- nut bi khoa khi form co loi hoac dang loading
- neu loi nam ngoai viewport, section/card loi can co affordance de nguoi dung tim thay, vi du counter loi hoac scroll den dong loi trong handler hien co

## Accessibility And Interaction

- tap targets toi thieu phu hop mobile, uu tien nut/icon co kich thuoc ro
- checkbox trong danh muc thuoc co the chon bang cach tap toan card
- sticky footer khong che mat noi dung cuoi; can padding bottom cho scroll content
- cac dialog full-screen van co nut dong ro rang
- keyboard navigation desktop khong bi pha
- text dai nhu ten thuoc, quy cach, ly do phai wrap dung, khong tran container

## Implementation Boundaries

Nen trien khai theo lop, de giam rui ro:

1. responsive dashboard shell
2. shared mobile primitives
3. facility mobile/tablet views
4. company mobile/tablet views
5. admin mobile/tablet views
6. cleanup va regression pass

Moi lop phai giu desktop duoc test sau khi thay doi.

Neu file hien tai qua lon, co the tach component presentation rieng trong `src/components/drug-orders/`, vi du:

- `DrugOrderMobileActionBar.tsx`
- `DrugOrderSummaryCard.tsx`
- `DrugOrderLineMobileCard.tsx`
- `DrugOrderShipmentMobileCard.tsx`
- `FacilityDrugOrderCatalogMobileList.tsx`
- `CompanyDrugOrderResponseMobileFlow.tsx`

Ten file cu the co the dieu chinh theo pattern code khi lap implementation plan. Yeu cau quan trong la khong tach business logic thanh ban sao rieng cho mobile.

## Testing Plan

Automated checks:

- `npm run lint`
- `npm run build` neu moi truong cho phep

Manual viewport checks:

- phone: `390x844`
- tablet portrait: `768x1024`
- tablet landscape: `1024x768`
- desktop: `1440x900`

Facility workflows:

- tao du tru moi
- chon thuoc tu goi y
- chon thuoc tu danh muc cong ty
- nhap so luong, dung goi y, xoa dong
- luu nhap
- gui cong ty
- thu hoi neu du quyen
- xac nhan thuc nhan voi so luong khop va lech

Company workflows:

- loc/chon don
- phan hoi du, mot phan, tu choi
- xu ly dong can xac nhan danh muc
- tao hoac cap nhat thuoc cong ty
- tao dot giao
- xem lich su giao nhan

Admin workflows:

- loc theo search, co so, cong ty, status, ngay
- mo chi tiet don
- xem dong thuoc
- xem timeline giao nhan
- xoa don du dieu kien
- xem warning khi don khong du dieu kien xoa

Desktop regression:

- sidebar desktop van hoat dong
- bang desktop van hien du cot
- dialog desktop van dung kich thuoc cu
- cac action desktop goi dung handler va hien loading/validation nhu truoc

## Rollout Notes

Vi module dang co nhieu thay doi chua commit trong worktree, implementation nen commit theo tung lop nho. Moi commit nen co mot noi dung ro:

- shell responsive
- facility mobile
- company mobile
- admin mobile
- cleanup/testing

Neu gap xung dot voi thay doi dang ton tai trong cung file, khong revert thay doi do. Can doc va lam tiep tren noi dung hien co.
