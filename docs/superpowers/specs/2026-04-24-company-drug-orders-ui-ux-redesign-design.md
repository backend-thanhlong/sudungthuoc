# Company Drug Orders UI UX Redesign Design

## Context

Trang `/dashboard/company/dutru-dat-hang` hien tai da ho tro day du nghiep vu cot loi:

- cong ty xem danh sach don dat hang tu co so
- phan hoi tung dong thuoc
- tao dot giao
- theo doi lich su giao va nhan
- quan ly danh muc thuoc cong ty trong cung mot man hinh

Tuy nhien UI hien tai con mang tinh "bang du lieu" hon la "man hinh van hanh":

- bang dong thuoc dang dung cot `Nguon`, trong khi thuc te hien tai dong don o man company da xoay quanh `CompanyDrug`
- thong tin thuoc dang bi tron lan giua cot `Thuoc`, cot `Nguon`, phan ly do, va dialog phan hoi
- khi can xem day du cac truong cua thuoc, nguoi dung phai doc nhieu text dong trong cung mot o bang
- dialog `Phan hoi don` dai, lap cau truc form, va chua tach ro thao tac nghiep vu voi ho so thuoc
- nhan dien truc quan giua "dung nghiep vu" va "chi tiet ky thuat cua thuoc" chua ro

Trong cung thoi diem, module nay da co mot thay doi nghiep vu quan trong:

- danh muc cong ty da duoc khoa theo huong thuoc cong ty gan voi `MasterDrug` hop le
- dieu nay lam cho cot `Nguon` tro nen kem gia tri hon truoc, vi nguoi dung company can thao tac tren `thuoc cong ty`, khong can tiep tuc xem day la luong "danh muc chung" hay "danh muc cong ty" o cap UI chinh

Yeu cau da chot:

- bo cot `Nguon`
- mat ngoai cua bang dong thuoc uu tien thong tin nghiep vu
- chi tiet day du cua thuoc se hien trong phan mo rong theo tung dong
- phan mo rong phai gom `ho so thuoc` va `tom tat tinh trang xu ly`, nhung khong lap lai full lich su dot giao
- toan bo man hinh can trong chuyen nghiep hon, ro vai tro, de xu ly don nhanh hon

## Goal

Xay dung lai UI UX cho `/dashboard/company/dutru-dat-hang` de:

- bien man hinh thanh mot `master-detail operations screen` dung nghia
- giup cong ty xu ly don nhanh hon ma khong mat thong tin
- dua `CompanyDrug` thanh thuc the trung tam trong man hinh company
- tach ro 3 lop thong tin:
  - thong tin tong quan cua don
  - quyet dinh nghiep vu tren tung dong
  - chi tiet ky thuat cua thuoc
- giam text lap lai va giam chieu cao cac dialog thao tac
- giu lai toan bo nghiep vu hien co: phan hoi don, tao dot giao, xem lich su, quan ly danh muc

## Scope

Bao gom:

- redesign tab `Orders` cua [CompanyDrugOrdersPage.tsx](/opt/sudungthuoc/sudungthuoc/src/components/drug-orders/CompanyDrugOrdersPage.tsx)
- bo cot `Nguon` trong bang dong thuoc
- them co che `expand / collapse` tren tung dong
- hien day du truong thuoc trong phan mo rong
- redesign dialog `Phan hoi don dat hang`
- tinh chinh dialog `Tao dot giao`
- dat lai visual hierarchy, summary bar, empty states, va action hierarchy

Khong bao gom:

- doi API nghiep vu company order
- doi rule phan hoi, doi rule giao hang, hoac doi status
- them route moi
- tach tab `Catalog` thanh route rieng trong pha nay
- pagination moi hoac filtering moi phuc tap cho danh sach dong thuoc trong don
- redesign tab `Catalog` thanh mot module moi hoan toan

## Current UX Problems

### 1. Bang dong thuoc dang qua "phang"

Bang hien tai dang dat canh nhau:

- ten thuoc
- nguon
- yeu cau
- chap nhan
- da giao
- con lai
- trang thai
- ly do

Van de:

- `Nguon` khong con la thong tin quyet dinh
- cot `Thuoc` bi gan qua nhieu thong tin vao cung mot o
- khong co muc "chi tiet co chu dich"; moi thu deu nam o cap bang chinh

### 2. Dinh danh thuoc chua ro rang

Nguoi dung company can biet nhanh:

- dong nay dang duoc gan voi thuoc cong ty nao
- neu chua gan thi co dang cho xac nhan danh muc hay khong
- thuoc chuan lien ket la gi
- quy cach va thong tin ky thuat day du cua thuoc

Hien tai nhung thong tin nay bi dat trong cac dong text phu, kho quet mat va kho so sanh giua cac dong.

### 3. Dialog phan hoi dai va nang

Dialog hien tai:

- moi dong la mot khoi form dai
- phan thong tin doc nhieu hon la scan
- khi can tao moi `CompanyDrug`, qua nhieu truong read-only duoc nhac lai trong mot block cao

Ket qua:

- kho theo doi tien do da phan hoi den dau
- kho phat hien dong nao con thieu thong tin
- khong tao cam giac "review workflow"

### 4. Man hinh chua phan vai ro

Trang nay dang chua nhieu viec:

- chon don
- doc don
- phan hoi
- giao hang
- xem lich su
- sua danh muc cong ty

Nhung visual hierarchy hien tai chua tach ro:

- thong tin nao de ra quyet dinh ngay
- thong tin nao chi can khi mo rong
- thong tin nao thuoc khu vuc lich su / audit

## Approach Options

### Option 1: Tinh chinh nhe tren bang hien tai

Lam:

- bo cot `Nguon`
- them vai dong phu trong cot `Thuoc`
- giu nguyen dialog hien tai

Uu diem:

- nhanh
- it rui ro

Nhuoc diem:

- khong giai quyet duoc van de hien thi qua nhieu thong tin o cap bang
- kho dat muc tieu "chuyen nghiep hon" ro ret

### Option 2: Master-detail, bang nghiep vu + dong mo rong

Lam:

- giu layout trai `Danh sach don` / phai `Chi tiet don`
- redesign bang dong thuoc theo huong nghiep vu truoc
- mo rong tung dong de xem du ho so thuoc va tom tat xu ly
- lam lai dialog phan hoi theo kieu `review queue`

Uu diem:

- phu hop yeu cau da chot
- ro nghiep vu
- de mo rong sau nay
- it lech khoi pattern hien co cua repo

Nhuoc diem:

- can doi kha nhieu UI trong mot component lon

### Option 3: Van hanh theo board / grouped workflow

Lam:

- nhom dong theo `Cho phan hoi`, `Cho giao`, `Da xong`
- giam tinh bang, tang tinh board

Uu diem:

- hien dai
- manh ve van hanh

Nhuoc diem:

- doi qua lon
- de va cham voi logic va pattern hien tai

## Recommendation

Chon Option 2.

Day la huong can bang nhat giua:

- muc tieu UX chuyen nghiep hon ro rang
- kha nang giu on dinh nghiep vu hien tai
- phu hop voi cau truc component va route dang co
- de trien khai theo tung khoi co gioi han ro

## Product Decisions

Da chot:

- bo cot `Nguon`
- mat ngoai cua bang uu tien nghiep vu
- expansion theo tung dong la noi hien `tat ca truong cua thuoc`
- expansion gom:
  - `Thong tin thuoc`
  - `Tinh trang xu ly`
- khong dua full shipment history vao expansion
- dialog `Phan hoi don` se duoc lam lai theo huong review queue
- dialog `Tao dot giao` giu don gian hon va nghiêng ve thao tac thuc thi

## Information Architecture

## 1. Top-level layout

Giu 2 tab lon:

- `Orders`
- `Catalog`

Trong tab `Orders`, giu bo cuc 2 cot:

- trai: `Danh sach don`
- phai: `Chi tiet don`

Li do giu cau truc nay:

- dang quen thuoc voi nguoi dung
- da phu hop voi nghiep vu chon 1 don de xu ly
- khong can tao route moi

## 2. Detail pane structure

Thu tu trong `Chi tiet don`:

1. `Header don`
2. `Summary bar`
3. `Ghi chu tu co so`
4. `Bang dong thuoc`
5. `Lich su dot giao`

Moi khu vuc co vai tro ro:

- `Header don`: nhan dien don va action chinh
- `Summary bar`: cho phep danh gia nhanh tinh hinh don
- `Bang dong thuoc`: noi ra quyet dinh va theo doi cap dong
- `Lich su dot giao`: noi audit va theo doi tien trinh giao hang

## Header And Summary Design

## 1. Header don

Header don can hien:

- so don
- ten co so + ma co so
- trang thai don
- ngay gui
- action chinh o ben phai:
  - `Phan hoi don`
  - `Tao dot giao`

Nguyen tac:

- action chinh luon nam trong header detail pane
- khong dat action rong rai o nhieu cho
- trang thai don phai co visual weight cao hon note va metadata phu

## 2. Summary bar

Summary bar nen la 4-5 card nho:

- `Tong so dong`
- `Tong yeu cau`
- `Tong chap nhan`
- `Tong da giao`
- `Dong cho xu ly`

`Dong cho xu ly` duoc hieu la:

- dong dang `PENDING`
- hoac `PENDING_CATALOG_CONFIRMATION`

Tac dung:

- cho cong ty nhin nhanh khong can doc bang
- giup quyet dinh co can phan hoi / giao ngay hay khong

## Order Lines Table Redesign

## 1. Bang ngoai

Bang dong thuoc se chi giu cac cot:

- `Mo rong`
- `Thuoc cong ty`
- `Yeu cau`
- `Chap nhan`
- `Da giao`
- `Con lai`
- `Trang thai`
- `Ly do`

Khong con cot:

- `Nguon`

Ly do:

- man company hien tai thao tac tren `CompanyDrug`
- `Nguon` khong con giup ra quyet dinh nhanh
- thong tin ky thuat can duoc day vao expansion thay vi chen vao bang

## 2. Render cot `Thuoc cong ty`

Mat ngoai cua dong hien:

- dong chinh: `companyDrugName`
- dong phu: `companyDrugCode`

Neu dong chua co `companyDrug`:

- dong chinh fallback sang `displayName`
- hien badge `Cho gan thuoc cong ty`
- neu co `masterDrug`, hien them mot dong phu ngan `Dang doi chot theo thuoc chuan`

Khong nen hien mot doan text dai mo ta trong cot nay.

## 3. Render cot `Ly do`

Cot `Ly do`:

- chi hien toi da 2 dong
- neu dai hon thi truncate
- phan day du se xem trong expansion

Muc tieu:

- bang van gon
- ly do van ton tai o cap ngoai vi no la thong tin nghiep vu quan trong

## 4. Status badge grouping

Status badge nen nhin ro theo 3 nhom mau:

- cho xu ly:
  - `PENDING`
  - `PENDING_CATALOG_CONFIRMATION`
- dang thuc hien:
  - `CONFIRMED`
  - `PARTIAL`
- ket thuc:
  - `REJECTED`
  - `COMPLETED`

Khong can doi enum backend; chi doi visual grouping.

## Row Expansion Design

## 1. Co che mo rong

Moi dong co mot nut `expand / collapse` o cot dau.

Mac dinh:

- dong deu collapse
- tai mot thoi diem chi nen mo 1 dong

Ly do:

- tranh man hinh bi dai va loang
- giu tap trung vao dong dang duoc xem

## 2. Cau truc expansion

Expansion gom 2 khoi:

- `Thong tin thuoc`
- `Tinh trang xu ly`

Tren desktop:

- co the xep 2 cot neu du rong

Tren mobile:

- xep doc

## 3. Khoi `Thong tin thuoc`

Khoi nay hien day du:

- Ma thuoc cong ty
- Ten thuoc cong ty
- Trang thai thuoc cong ty:
  - dang hoat dong
  - da ngung su dung
- Hoat chat
- Ham luong
- So dang ky
- Dang bao che
- Quy cach
- Don vi
- Thuoc chuan lien ket:
  - `maChung`
  - `tenThuoc`
- Trang thai lien ket:
  - da lien ket hop le
  - legacy / can ra soat

Nguon du lieu:

- uu tien `companyDrug`
- fallback sang `masterDrug` o nhung field can thiet neu dong dang cho xac nhan danh muc

## 4. Khoi `Tinh trang xu ly`

Khoi nay hien:

- so luong yeu cau
- so luong chap nhan
- da giao
- da nhan
- con lai
- ly do phan hoi day du
- thuoc cong ty da duoc chot cho dong nay
- thong tin dot giao gan nhat neu co:
  - so dot giao
  - ngay giao
  - so luong giao gan nhat

Khong hien:

- full shipment history
- danh sach receipt day du

Ly do:

- thong tin do da co section `Lich su dot giao`
- expansion chi can ho tro quyet dinh cap dong

## Response Dialog Redesign

## 1. Muc tieu

Dialog `Phan hoi don dat hang` phai tro thanh mot `review queue`:

- scan nhanh
- nhap quyet dinh nhanh
- biet ngay dong nao chua hop le

## 2. Cau truc dialog moi

Header dialog hien:

- ten don
- ten co so
- progress:
  - `Da phan hoi x / tong so dong`

Filter nhanh o dau dialog:

- `Tat ca`
- `Cho phan hoi`
- `Cho gan thuoc cong ty`
- `Thieu thong tin`

## 3. Card moi dong phan hoi

Moi dong la mot card, khong phai mot block form qua dai.

Phan dau card:

- ten thuoc
- ma thuoc cong ty neu co
- so luong yeu cau
- badge tinh trang neu can gan danh muc

Phan thao tac:

- select `Xac nhan du / Giao mot phan / Tu choi`
- input `So luong chap nhan` chi mo khi `Giao mot phan`
- textarea `Ly do phan hoi`

## 4. Block `Gan thuoc cong ty`

Chi hien khi dong can `PENDING_CATALOG_CONFIRMATION` va khong bi tu choi.

Block gom:

- select chon `CompanyDrug` da map san
- option `Tao moi trong danh muc cong ty`

Neu `Tao moi`:

- chi cho nhap:
  - `Ma thuoc cong ty`
  - `Quy cach`
- hien summary read-only nho gon:
  - ten thuoc
  - hoat chat
  - ham luong
  - so dang ky
  - dang bao che
  - don vi

Khong render lai mot form cao va rong cho cac truong read-only.

## 5. Dieu kien enable CTA

Nut `Luu phan hoi` chi enable khi:

- moi dong da co quyet dinh
- moi dong da co ly do
- dong `PARTIAL` co acceptedQty hop le
- dong can gan thuoc cong ty da duoc chon hoac tao moi hop le

Dialog nen co thong diep tong hop ngan neu con loi:

- con bao nhieu dong chua hoan tat

## Shipment Dialog Redesign

## 1. Vai tro

Dialog `Tao dot giao` la dialog thuc thi, khong phai dialog phan tich.

Vi vay no nen gon hon dialog phan hoi.

## 2. Cau truc

Header:

- thong tin don
- tom tat:
  - so dong se giao
  - tong so luong du kien giao

Phan nhap chung:

- thoi diem giao
- ghi chu dot giao

Bang dong giao:

- `Thuoc cong ty`
- `Con lai`
- `So giao ky nay`
- `Ly do`

Khong can lap lai:

- hoat chat
- ham luong
- thong tin ky thuat day du

Ly do:

- nhung thong tin do da co o man detail va expansion
- dialog nay can uu tien thao tac nhanh va chinh xac

## Visual Language

## 1. Tong the

Giu visual language cua dashboard hien tai, nhung can:

- giam cam giac "bang hanh chinh"
- tang khoang trang va grouping
- tang do ro cua action chinh

Khong can theo huong flashy. Muc tieu la:

- tinh chuyen nghiep
- de doc
- de dieu hanh

## 2. Nguyen tac hien thi

- thong tin nghiep vu luon dung visual weight cao hon metadata
- text phu dung cap mau nhe va nhat quan
- card va section co border ro, khong qua dam
- badge trang thai dung mau on dinh, khong doi y nghia giua cac khu vuc

## 3. Typography va density

- title khu vuc ro rang, ngan
- trong bang, dong chinh la ten thuoc cong ty
- dong phu la ma thuoc, thong tin lien ket, hoac canh bao
- tranh 3-4 dong text nho trong cung mot o bang neu khong bat buoc

## Behavior Rules

## 1. Expand state

- chi mo 1 dong tai 1 thoi diem
- khi chuyen don, reset expansion
- khi refresh detail, neu dong dang mo van con ton tai thi co the giu lai

## 2. Responsiveness

Desktop:

- bang day du
- expansion 2 cot

Tablet:

- bang van giu, nhung co the giam mot vai width co dinh

Mobile:

- danh sach dong co the chuyen thanh stacked cards
- expansion xep doc
- action chinh van giu o tren

Khong can thiet ke hai nghiep vu khac nhau; chi doi presentation.

## 3. Empty And Error States

Can co state ro cho:

- chua chon don
- dang tai chi tiet
- loi tai chi tiet
- don chua co dot giao
- dialog phan hoi chua co dong hop le
- dialog shipment khong co dong nao con lai de giao

Empty state nen ngan, ro, khong dung van ban dai.

## Accessibility

Can bao dam:

- nut expand co label ro
- co the thao tac bang keyboard
- row expansion khong chi phu thuoc vao mau
- badge va trang thai co text ro rang
- cac input trong dialog co `Label` dung va nhat quan

## Testing And Verification

## 1. Functional verification

Can verify:

- bo cot `Nguon` khong lam mat thong tin can thiet
- expansion hien du tat ca truong thuoc
- dong chua gan `CompanyDrug` van de nhan dien va xu ly
- dialog phan hoi van cover du cac case:
  - confirmed
  - partial
  - rejected
  - pending catalog confirmation
- dialog tao dot giao van dung voi cac dong con lai khac nhau

## 2. UX verification

Can test thu cong:

- nguoi dung co nhin ra nhanh dong nao can xu ly
- ly do bi truncate o bang nhung xem du trong expansion
- expansion co giup giam nhieu text trong bang khong
- dialog phan hoi co ngan hon va de scan hon hien tai khong
- mobile / viewport hep co van doc duoc khong

## Rollout Notes

- redesign nay nen duoc implement trong cung component hien co, khong doi route
- co the rollout tung khoi:
  1. bang dong thuoc + expansion
  2. dialog phan hoi
  3. dialog shipment
- neu can rollback UI, khong anh huong den API va du lieu backend

## Out Of Scope Follow-ups

Khong lam trong pha nay nhung nen ghi lai:

- filter dong thuoc theo status ngay trong bang detail
- bulk response thao tac hang loat
- tach `Catalog` thanh workspace rieng neu tiep tuc phinh to
- lich su audit cap dong phong phu hon trong expansion

## Definition Of Done

1. Bang dong thuoc khong con cot `Nguon`.
2. Mat ngoai cua bang uu tien thong tin nghiep vu.
3. Moi dong co expansion de xem du tat ca truong cua thuoc.
4. Expansion gom `Thong tin thuoc` va `Tinh trang xu ly`.
5. Khong lap lai full shipment history trong expansion.
6. Dialog `Phan hoi don` duoc doi sang kieu review queue.
7. Dialog `Tao dot giao` duoc rut gon theo huong thao tac thuc thi.
8. UI company order cho cam giac ro rang, chuyen nghiep hon, va scan nhanh hon man hinh hien tai.
