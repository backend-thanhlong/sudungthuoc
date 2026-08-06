# Gioi thieu phan mem quan ly duoc va giam sat cung ung

## 1. Muc tieu cua phan mem

Phan mem duoc xay dung de ho tro co quan quan ly va bo phan nghiep vu duoc theo doi tap trung tinh hinh ton kho, su dung thuoc, dau thau, mua sam va nguy co dut gay cung ung tren toan he thong co so y te.

Thay vi tong hop thu cong tu tung bao cao rieng le, he thong gom du lieu bao cao ton - nhap - xuat, danh muc thuoc, co so y te, hop dong trung thau, ke hoach lua chon nha thau, thong bao moi thau va ket qua lua chon nha thau vao cac man hinh phan tich truc quan. Nguoi quan ly co the nhin nhanh tinh hinh toan nganh, loc theo ky bao cao hoac theo tung co so, sau do di sau vao tung nhom thuoc, tung mat hang, tung nha cung ung va tung goi thau.

Ba khu vuc chinh duoc gioi thieu trong tai lieu nay:

- `/dashboard/admin`: dashboard quan ly duoc toan nganh.
- `/dashboard/admin/mua-sam/tra-cuu`: tra cuu tien trinh mua sam theo goi thau quy trinh 1.
- `/dashboard/inventory-search`: tra cuu ton kho theo thuoc, theo co so va so sanh ton kho giua cac co so.

## 2. Gia tri quan ly noi bat

Phan mem mang lai 5 gia tri quan ly chinh.

1. **Nam nhanh quy mo ton kho va su dung thuoc**  
   Lanh dao co the xem tong gia tri ton kho, ty le thuoc trong nuoc, so mat hang dang quan ly, co cau su dung BHYT - dich vu, co cau nhom thuoc va dia ban tap trung ton kho.

2. **Canh bao nguy co dut gay cung ung**  
   He thong tu dong tinh nhu cau binh quan va so thang du dung cua tung thuoc tai tung co so. Cac truong hop het hang, con hang nhung duoi 3 thang, hoac ton kho khong phat sinh nhu cau duoc tach rieng de xu ly.

3. **Kiem soat dau thau va hop dong**  
   Dashboard dau thau giup nhin tien do hop dong, hop dong sap het han, top nha cung ung va cac truong hop chenh lech gia giua cac goi thau.

4. **Phan tich su dung thuoc theo ABC va nhom quan ly**  
   He thong xep hang ABC theo gia tri tieu thu, giup xac dinh nhom thuoc chiem ty trong chi phi lon nhat, nhom can uu tien kiem soat, cac thuoc nhieu muc gia, thuoc kiem soat dac biet va dong du lieu can ra soat.

5. **Tra cuu nhanh de dieu hanh va phoi hop**  
   Chuc nang tra cuu ton kho cho biet thuoc nao dang con tai co so nao, mot co so dang con nhung thuoc nao, va cung mot thuoc thi co so nao con nhieu hon, gia VAT nao thap hon, ky bao cao co dong nhat hay khong.

## 3. Trang Dashboard quan ly duoc: `/dashboard/admin`

Trang nay la man hinh dieu hanh tong hop cho tai khoan quan tri. Nguoi dung co the loc theo:

- **Ky bao cao**: xem tat ca cac ky hoac mot thang cu the.
- **Don vi**: xem toan nganh hoac rieng mot co so y te.

Dashboard gom 5 tab: Tong quan, Cung ung, Dau thau, Phan tich su dung thuoc va Thuoc hiem.

### 3.1. Tab Tong quan

Tab Tong quan tra loi cac cau hoi quan ly:

- Toan nganh dang ton kho bao nhieu tien?
- Ty le su dung thuoc trong nuoc ra sao?
- Co bao nhieu mat hang dang duoc quan ly?
- Don vi nao ton kho lon nhat?
- Gia tri nhap, xuat tap trung o co so nao?
- Dia ban nao dang tap trung ton kho?

#### Cac chi so KPI

**Tong gia tri ton kho**  
Y nghia: phan anh quy mo tien hang con ton tai kho cua pham vi dang xem.

Cach tinh:

```text
Tong gia tri ton kho = tong thanhTienTonCuoi cua cac dong bao cao trong bo loc
```

**Ty le thuoc noi theo gia tri xuat kho**  
Y nghia: cho biet ty trong gia tri su dung cua thuoc trong nuoc trong tong gia tri xuat kho.

Cach tinh:

```text
Gia tri xuat tung dong = xuat * giaVat
Ty le thuoc noi = tong gia tri xuat cua thuoc Trong nuoc / tong gia tri xuat * 100
```

Thuoc duoc tinh la trong nuoc khi danh muc chuan co truong `isTrongNuoc` mang cac gia tri tuong duong "Trong nuoc", "Co", "true" hoac "1".

**Ty le su dung thuoc Trong nuoc theo so dong su dung**  
Y nghia: bo sung goc nhin theo tan suat dong bao cao, khong chi theo tien. Chi so nay cho biet trong cac dong co phat sinh xuat va da phan loai noi/ngoai, bao nhieu dong la thuoc trong nuoc.

Cach tinh:

```text
Ty le dong thuoc trong nuoc =
so dong co xuat > 0 va la thuoc Trong nuoc
/ so dong co xuat > 0 va da phan loai Trong nuoc hoac Nuoc ngoai
* 100
```

**So mat hang quan ly**  
Y nghia: cho biet so ma thuoc phan biet dang xuat hien trong bao cao.

Cach tinh:

```text
So mat hang quan ly = so luong mapId khac nhau trong InventoryReport theo bo loc
```

#### Bieu do Gia tri ton kho tat ca don vi theo nhom thuoc

Y nghia: so sanh gia tri ton kho giua cac co so, dong thoi nhin co cau ton kho theo nhom thuoc. Bieu do giup phat hien co so co ton kho lon bat thuong hoac co cau ton kho lech ve mot nhom thuoc.

Cach tinh:

```text
Gia tri ton kho cua mot nhom tai mot co so =
tong thanhTienTonCuoi cua cac dong thuoc thuoc nhom do tai co so do
```

Nhom thuoc duoc chuan hoa ve cac nhom:

- Hoa duoc
- Duoc lieu
- Sinh pham
- Thuoc co truyen
- Vac xin
- Khac

#### Bieu do Top 10 CSYT ton kho lon nhat

Y nghia: xep hang 10 co so co tong gia tri ton kho cao nhat. Cot duoc chia theo nhom thuoc de thay co so ton nhieu o nhom nao.

Cach tinh:

```text
Tong ton kho cua co so = tong thanhTienTonCuoi cua co so
Top 10 = 10 co so co tong ton kho cao nhat
```

#### Bieu do BHYT vs Dich vu

Y nghia: cho biet co cau gia tri su dung thuoc theo nguon thanh toan BHYT va dich vu.

Cach tinh:

```text
Gia tri BHYT = tong (xuat * giaVat) cua dong co bhyt la Co/true/1/x
Gia tri Dich vu = tong (xuat * giaVat) cua dong co dichVu la Co/true/1/x
Ty trong tung phan = gia tri phan do / tong gia tri BHYT + Dich vu
```

#### Bieu do Top 10 co so gia tri Xuat lon nhat

Y nghia: cho biet co so nao co gia tri su dung thuoc cao nhat trong pham vi dang xem. Day la co so quan trong de danh gia muc do tieu thu, nhu cau va ap luc cung ung.

Cach tinh:

```text
Gia tri xuat cua dong = xuat * giaVat
Gia tri xuat cua co so theo nhom = tong gia tri xuat cua cac dong trong nhom
Top 10 = 10 co so co tong gia tri xuat cao nhat
```

#### Bieu do Top 10 co so gia tri Nhap lon nhat

Y nghia: cho biet co so nao nhap hang co gia tri lon nhat, qua do theo doi dong hang vao va muc do phan bo nguon cung.

Cach tinh:

```text
Gia tri nhap cua dong = nhap * giaVat
Gia tri nhap cua co so theo nhom = tong gia tri nhap cua cac dong trong nhom
Top 10 = 10 co so co tong gia tri nhap cao nhat
```

Bieu do treemap the hien kich thuoc o theo gia tri nhap: o cang lon thi gia tri nhap cang cao.

#### Ban do Gia tri ton kho theo dia chi

Y nghia: hien thi ton kho theo toa do co so y te, giup nhin phan bo dia ly cua hang ton. Khi chon mot thuoc cu the, ban do cho biet thuoc do dang ton tai co so nao.

Cach tinh:

```text
Gia tri ton kho tren diem ban do =
tong thanhTienTonCuoi cua co so
hoac tong thanhTienTonCuoi cua thuoc dang loc tai co so
```

Kich thuoc diem tren ban do tang theo can bac hai cua ty le gia tri ton kho so voi co so co gia tri lon nhat, de diem lon nho de nhin ma khong qua chen nhau.

#### Bang Phan bo ton kho theo dia ban

Y nghia: xep hang dia ban theo gia tri ton kho, phu hop de trinh bay noi nao dang tap trung nguon hang.

Cach tinh:

```text
Gia tri ton kho dia ban = tong thanhTienTonCuoi cua cac co so co cung dia chi
Ty trong dia ban = gia tri ton kho dia ban / tong gia tri ton kho tat ca dia ban * 100
```

### 3.2. Tab Cung ung

Tab Cung ung tap trung vao nguy co het hang, du hang, hop dong sap het han va goi y dieu chuyen.

Nguoi dung co the chon chuan nhu cau:

- 1 ky gan nhat
- trung binh 3 ky gan nhat
- trung binh 6 ky gan nhat

#### Cong thuc nen tang

He thong lay snapshot tai ky dang xem. Neu khong chon ky, he thong dung ky moi nhat trong du lieu.

Voi tung cap `co so - thuoc`:

```text
Nhu cau binh quan =
trung binh xuat cua 1/3/6 ky gan nhat tinh den ky dang xem

So thang du dung =
tonCuoi ky dang xem / nhu cau binh quan
```

Neu nhu cau binh quan bang 0, he thong khong tinh so thang du dung va tach vao nhom ton kho khong co nhu cau.

#### Cac KPI cung ung

**Gia tri ton kho cuoi ky**  

```text
Tong gia tri ton kho cuoi ky = tong thanhTienTonCuoi trong snapshot ky dang xem
```

**Gia tri xuat kho**  

```text
Tong gia tri xuat = tong (xuat * giaVat) trong snapshot ky dang xem
```

**So dong het hang**  

```text
Het hang = tonCuoi = 0 va nhu cau binh quan > 0
```

**So dong thieu duoi 1 thang**

```text
Thieu duoi 1 thang = 0 < so thang du dung < 1
```

**Ton kho khong co nhu cau**

```text
Ton khong co nhu cau = tonCuoi > 0 va nhu cau binh quan = 0
```

**Hop dong sap het han**

```text
Hop dong sap het han = dong co nhu cau > 0, co ngay ket thuc hop dong,
va ngay ket thuc nam trong 90 ngay tinh tu ngay hien tai
```

#### Bang Da het hang cuoi ky

Y nghia: liet ke cac thuoc da het ton cuoi ky nhung van co nhu cau su dung. Day la nhom can xu ly uu tien vi co nguy co anh huong truc tiep den dieu tri.

Cach tinh:

```text
tonCuoi = 0 va nhu cau binh quan > 0
Sap xep theo nhu cau binh quan giam dan, sau do xuat ky hien tai giam dan
```

#### Bang Nguy co dut gay

Y nghia: liet ke cac thuoc van con ton nhung khong du do phu 3 thang. Bang nay giup chuan bi mua sam, dieu chuyen hoac uu tien ky hop dong truoc khi het hang.

Cach tinh:

```text
tonCuoi > 0
nhu cau binh quan > 0
so thang du dung < 3
```

Muc canh bao:

- Do: duoi 1 thang.
- Cam: tu 1 den duoi 2 thang.
- Vang: tu 2 den duoi 3 thang.

#### Bieu do Ma tran Nhu cau/Do phu ton kho

Y nghia: bieu do scatter dat tung thuoc cua tung co so len ma tran. Truc X la nhu cau binh quan, truc Y la so thang du dung. Diem cang ve ben phai la nhu cau cang lon; diem cang thap la nguy co thieu cang cao.

Cach tinh:

```text
X = nhu cau binh quan
Y = tonCuoi / nhu cau binh quan
Mau diem = muc canh bao theo so thang du dung
```

Duong tham chieu 1 thang va 3 thang giup nhan dien nhanh nguong nguy co.

#### Bang Ton kho khong co nhu cau

Y nghia: tach rieng cac thuoc con ton nhung khong co xuat trong cua so nhu cau. Nhom nay co the la ton cham luan chuyen, sai nhu cau, hoac can ra soat lai danh muc.

Cach tinh:

```text
tonCuoi > 0 va nhu cau binh quan = 0
Sap xep theo tonCuoi giam dan
```

#### Goi y dieu chuyen thuoc

Y nghia: khi chon mot hoat chat, he thong chi ra co so dang thua va co so dang thieu, ho tro dieu phoi noi bo.

Cach tinh:

```text
Gop cac dong cung hoat chat theo co so
Tong ton = tong tonCuoi
Tong nhu cau = tong nhu cau binh quan
So thang du dung = tong ton / tong nhu cau
```

Co so thua:

```text
tonCuoi > 0, nhu cau > 0, so thang du dung > 3
```

Co so thieu:

```text
tonCuoi = 0 va nhu cau > 0
```

#### Cac bang rui ro mo rong

He thong con tinh:

- Top ton kho cao theo gia tri: cac thuoc co ton kho gia tri lon va do phu tu 3 thang tro len.
- Top thieu theo gia tri rui ro: cac thuoc co do phu duoi 1 thang, sap xep theo `nhu cau binh quan * giaVat`.
- Rui ro hop dong: hop dong da het han hoac se het han trong 30/60/90 ngay.
- Phu thuoc nha cung ung: tong hop theo nha cung ung, so co so lien quan, so dong thuoc, gia tri ton, gia tri rui ro va so hop dong sap het/da het han.

### 3.3. Tab Dau thau

Tab Dau thau giup theo doi hop dong cung ung va bat thuong ve gia.

#### Bieu do Gantt Tien do hop dong cung ung

Y nghia: hien thi thoi gian hieu luc cua tung so quyet dinh trung thau. Mau sac the hien trang thai:

- Xanh: con hieu luc.
- Vang/cam: sap het han trong 30 ngay.
- Xam/do mo: da het han.

Cach tinh:

```text
Moi soQdTrungThau duoc gom thanh mot hop dong
Ngay bat dau = ngayBatDauHd
Ngay ket thuc = ngayKetThucHd
So thuoc = so dong bao cao thuoc cung soQdTrungThau
Trang thai = so sanh ngayKetThucHd voi ngay hien tai va moc 30 ngay
```

#### Bang Hop dong sap het han trong 60 ngay

Y nghia: liet ke cac dong hop dong can chuan bi ke hoach dau thau moi hoac gia han nguon cung.

Cach tinh:

```text
ngayKetThucHd >= ngay hien tai
va ngayKetThucHd <= ngay hien tai + 60 ngay
```

#### Bieu do Top 10 nha cung ung

Y nghia: cho biet nha cung ung nao chiem gia tri cung ung lon nhat, ho tro theo doi muc do phu thuoc nha cung ung.

Cach tinh:

```text
Gia tri cung ung cua dong = nhap * giaVat
Gia tri nha cung ung = tong gia tri cung ung theo tenCongTy
Top 10 = 10 nha cung ung co gia tri cao nhat
```

#### Bang So sanh gia giua cac goi thau

Y nghia: phat hien cung hoat chat va ham luong nhung gia VAT giua cac goi thau/nha cung ung chenh lech dang ke.

Cach tinh:

```text
Gom nhom theo hoatChat + hamLuong
Loai trung theo soQdTrungThau + tenCongTy
Lay minPrice va maxPrice cua giaVat > 0
Ty le chenh lech = (maxPrice - minPrice) / minPrice * 100
Chi hien thi neu chenh lech > 5%
```

### 3.4. Tab Phan tich su dung thuoc

Tab nay gom hai lop phan tich: tong quan co cau su dung va phan tich ABC.

#### Cong thuc nen tang

```text
So luong tieu thu = xuat
Gia tri tieu thu = xuat * giaVat
```

Nhung dong co `gia tri tieu thu <= 0` khong dua vao xep hang ABC. Dong co xuat nhung gia bang 0 duoc dem vao nhom can kiem tra chat luong du lieu.

#### Cac KPI ABC

**Tong gia tri tieu thu**

```text
Tong gia tri tieu thu = tong (xuat * giaVat) cua cac dong hop le
```

**Tong so luong tieu thu**

```text
Tong so luong tieu thu = tong xuat cua cac dong hop le
```

**So mat hang ABC**

```text
So mat hang ABC = so thuoc sau khi gom nhom va co gia tri tieu thu hop le
```

**Dong can kiem tra**

```text
Dong can kiem tra = so dong co gia tri tieu thu <= 0, khong dua vao ABC
```

#### Cac bieu do co cau su dung

Cac bieu do co cau chi tinh thuoc da anh xa vao danh muc thuoc chuan. Dong chua anh xa duoc thong bao rieng de nguoi dung biet da bi loai khoi bieu do.

He thong cho chuyen giua hai thang do:

- Gia tri su dung.
- So luong su dung.

Cac chieu phan tich:

- Nhom thuoc.
- Nhom dieu tri.
- Top nhom su dung cao nhat.
- Thuoc kiem soat dac biet.
- Thuoc ke don.
- Thuoc trong nuoc.
- Top co so y te theo su dung.

Cach tinh chung:

```text
Gia tri cua lat cat = tong (xuat * giaVat) cua cac dong thuoc thuoc lat cat do
So luong cua lat cat = tong xuat cua cac dong thuoc thuoc lat cat do
Ty trong gia tri = gia tri lat cat / tong gia tri tat ca lat cat * 100
Ty trong so luong = so luong lat cat / tong so luong tat ca lat cat * 100
```

#### Bieu do Pareto ABC

Y nghia: xac dinh nhom thuoc tao ra phan lon gia tri tieu thu. Cot the hien gia tri tung thuoc, duong line the hien ty le tich luy.

Cach tinh:

```text
1. Gom dong bao cao theo thuoc.
   Neu da anh xa danh muc chuan: gom theo masterDrugId.
   Neu chua anh xa: gom theo facilityId + maNoiBo.

2. Tinh tong gia tri tung thuoc:
   tongGiaTriThuoc = tong (xuat * giaVat)

3. Sap xep thuoc theo tongGiaTriThuoc giam dan.

4. Tinh ty le:
   percent = tongGiaTriThuoc / tong gia tri tat ca thuoc * 100
   cumulativePercent = tong gia tri tich luy den thuoc hien tai / tong gia tri tat ca thuoc * 100

5. Phan hang:
   Hang A: cac thuoc khi gia tri tich luy truoc thuoc do < 80%
   Hang B: cac thuoc khi gia tri tich luy truoc thuoc do >= 80% va < 95%
   Hang C: phan con lai
```

#### Bang chi tiet ABC

Y nghia: cho phep xem tung thuoc, so luong, gia tri, don gia binh quan, khoang gia, hang ABC va cac canh bao nghiep vu.

Cach tinh mot so cot:

```text
Tong so luong = tong xuat cua thuoc
Tong gia tri = tong (xuat * giaVat) cua thuoc
Don gia binh quan = tong gia tri / tong so luong
Khoang gia = giaVat nho nhat den giaVat lon nhat cua thuoc
So CSYT = so co so co phat sinh thuoc do
CSYT lon nhat = co so co tong gia tri tieu thu thuoc do cao nhat
```

#### Giam sat ABC

Y nghia: day la danh sach can ra soat sau khi xep hang:

- Hang A kiem soat dac biet: vua chiem gia tri cao vua can quan ly chat.
- Hang A nhieu muc gia: cung thuoc nhung co nhieu gia, can ra soat nguyen nhan.
- Xuat nhung gia bang 0: can kiem tra du lieu gia.
- Chua anh xa co tieu thu: can hoan thien danh muc anh xa.

### 3.5. Tab Thuoc hiem

Tab Thuoc hiem chi tinh cac thuoc trong danh muc chuan co `isThuocHiem = true`.

#### KPI Thuoc hiem

**So thuoc hiem**

```text
So thuoc hiem = so thuoc hiem khac nhau co phat sinh bao cao trong bo loc
```

**Don vi bao cao**

```text
Don vi bao cao = so co so co dong bao cao thuoc hiem
```

**Gia tri xuat kho**

```text
Gia tri xuat kho thuoc hiem = tong (xuat * giaVat)
```

**Gia tri ton kho**

```text
Gia tri ton kho thuoc hiem = tong thanhTienTonCuoi
```

**So luong ton**

```text
So luong ton thuoc hiem = tong tonCuoi
```

#### Bieu do Tat ca don vi theo gia tri xuat thuoc hiem

Y nghia: xep hang co so theo gia tri su dung thuoc hiem. Khong gioi han Top, nen co the dung de ra soat toan bo co so co phat sinh.

Cach tinh:

```text
Gia tri xuat thuoc hiem cua co so = tong (xuat * giaVat) cua thuoc hiem tai co so
```

#### Bieu do Tat ca thuoc hiem theo gia tri ton kho

Y nghia: cho biet thuoc hiem nao dang co gia tri ton kho cao nhat. Day la co so de uu tien theo doi bao quan, han dung, dieu chuyen hoac dam bao nguon cung.

Cach tinh:

```text
Gia tri ton kho cua thuoc hiem = tong thanhTienTonCuoi cua thuoc do
```

#### Bieu do Xu huong theo thang cua thuoc hiem

Y nghia: theo doi bien dong gia tri xuat va ton kho thuoc hiem theo thoi gian.

Cach tinh:

```text
Gia tri xuat theo thang = tong (xuat * giaVat) cua thuoc hiem trong thang
Gia tri ton theo thang = tong thanhTienTonCuoi cua thuoc hiem trong thang
```

#### Bieu do Co cau BHYT/Dich vu cua thuoc hiem

Y nghia: cho biet thuoc hiem duoc su dung chu yeu theo nguon BHYT hay dich vu.

Cach tinh:

```text
Gia tri BHYT thuoc hiem = tong (xuat * giaVat) cua dong thuoc hiem co bhyt la Co/true/1/x
Gia tri Dich vu thuoc hiem = tong (xuat * giaVat) cua dong thuoc hiem co dichVu la Co/true/1/x
```

#### Ban do va Heatmap don vi co ton kho thuoc hiem

Y nghia: xac dinh vi tri cac co so dang co ton kho thuoc hiem va ty trong ton kho cua tung co so. Phu hop cho dieu phoi nguon thuoc hiem trong tinh huong khan hiem.

Cach tinh:

```text
Gia tri ton kho thuoc hiem cua co so = tong thanhTienTonCuoi cua thuoc hiem tai co so
Ty trong co so = gia tri ton kho thuoc hiem cua co so / tong gia tri ton kho thuoc hiem tat ca co so * 100
```

## 4. Trang Tra cuu Mua sam: `/dashboard/admin/mua-sam/tra-cuu`

Trang nay dung de tra cuu tien trinh mua sam cua tung goi thau quy trinh 1 tren toan he thong. Muc tieu la giup can bo quan ly theo doi mot goi thau dang o dau trong chuoi:

```text
KHLCNT -> Goi thau -> TBMT -> KQLCNT -> Ket qua phan lo/nha thau trung
```

### 4.1. Bo loc tra cuu

Nguoi dung co the loc theo:

- Tu khoa: ten goi thau, ma KHLCNT, ma TBMT, so quyet dinh KQLCNT, ten hoac ma don vi.
- Don vi.
- Trang thai tien trinh.
- Loai mua sam: Thuoc hoac Hoa chat, vat tu, thiet bi y te.
- Khoang ngay phe duyet KHLCNT.

Tat ca du lieu duoc gioi han o `quyTrinh = 1`.

### 4.2. Cac the tong hop trang thai

**Tong goi thau**

```text
Tong goi thau = so GoiThau thoa man bo loc
```

**Chua co TBMT**

```text
Chua co TBMT = goi thau khong co ThongBaoMoiThau nao
```

Y nghia: goi thau moi o buoc ke hoach/goi thau, chua cong bo moi thau.

**Da co TBMT, chua co KQLCNT**

```text
Da co TBMT, chua co KQLCNT =
goi thau co it nhat mot ThongBaoMoiThau
va khong co KetQuaLCNT nao
```

Y nghia: goi thau da moi thau nhung chua co ket qua lua chon nha thau.

**Da co KQLCNT**

```text
Da co KQLCNT = goi thau co it nhat mot KetQuaLCNT
```

Y nghia: goi thau da co ket qua phe duyet lua chon nha thau.

### 4.3. Bang danh sach goi thau

Moi dong bieu dien tien trinh day du cua mot goi thau. Cac thong tin chinh:

- Don vi.
- Ma va ten KHLCNT.
- Ten goi thau.
- Gia goi thau.
- Ma TBMT va ngay dang tai.
- So quyet dinh KQLCNT va ngay phe duyet.
- So mat hang trung thau.
- Tong gia tri trung thau.
- So nha thau trung.
- Trang thai tien trinh.

Neu mot goi thau co nhieu TBMT hoac KQLCNT, he thong lay ban ghi dai dien moi nhat theo ngay dang tai/ngay phe duyet va thoi diem tao.

### 4.4. Man hinh chi tiet goi thau

Khi chon "Xem chi tiet", phan mem hien:

- Thong tin don vi.
- Thong tin KHLCNT.
- Thong tin goi thau.
- Thong tin TBMT.
- Thong tin KQLCNT.
- Danh sach ket qua phan lo, don gia trung thau va nha thau trung thau.

Y nghia quan ly: co the truy vet toan bo tien trinh cua mot goi thau tren mot man hinh, han che viec mo nhieu bang rieng le.

## 5. Trang Tra cuu ton kho: `/dashboard/inventory-search`

Trang nay ho tro tra cuu ton kho hien co dua tren snapshot moi nhat da duyet cua tung cap `co so - thuoc`.

Diem quan trong:

```text
Chi lay bao cao co status = APPROVED
Chi lay dong co ton_cuoi > 0
Voi moi cap co so - thuoc, lay ky bao cao moi nhat
```

Do do, so lieu tren trang nay la ton kho hien co gan nhat, khong phai tong luy ke qua nhieu ky.

### 5.1. Che do Theo thuoc

Y nghia: tim mot thuoc va xem thuoc do dang con tai nhung co so nao.

Nguoi dung co the:

- Tim theo ma thuoc, ten thuoc, hoat chat, ham luong.
- Loc thuoc kiem soat dac biet.
- Loc thuoc hiem.
- Sap xep theo ten thuoc, tong ton kho hoac so co so.

Cach tinh:

```text
Tong ton kho cua thuoc = tong tonCuoi moi nhat cua thuoc do tai tat ca co so
So co so = so co so co tonCuoi > 0 cua thuoc do
```

Neu thuoc da anh xa danh muc chuan, he thong gom theo `masterDrugId`. Neu chua anh xa, he thong gom theo ma thuoc noi bo.

Khi mo rong mot dong thuoc, bang con hien danh sach co so con ton, gom:

- Ma co so.
- Ten co so.
- Nhom TCKT.
- Ton kho.
- Gia VAT.
- Ky bao cao moi nhat.

### 5.2. Che do Theo co so

Y nghia: xem mot co so dang con nhung thuoc nao.

Nguoi dung chon co so, sau do co the tim thuoc trong co so va sap xep theo:

- Ten thuoc A-Z.
- Ton kho giam dan.
- Gia VAT tang dan.

Cach tinh the tong hop:

```text
So thuoc co ton = so thuoc khac nhau co tonCuoi > 0 tai co so
Tong luong ton = tong tonCuoi moi nhat cua tat ca thuoc tai co so
```

Bang ket qua hien ma thuoc, ten thuoc, hoat chat, ham luong, nhom TCKT, so dang ky, don vi tinh, ton kho, gia VAT va ky bao cao.

### 5.3. Che do So sanh co so

Y nghia: so sanh cung mot thuoc giua it nhat hai co so. Chuc nang nay phu hop khi can dieu chuyen thuoc hoac so sanh gia va ky bao cao.

Cach tinh:

```text
Voi thuoc duoc chon, lay cac dong snapshot moi nhat cua tung co so
Ton kho cua co so = tong tonCuoi cua thuoc do tai co so
Gia VAT = gia VAT cua dong co ky bao cao moi nhat
Ky bao cao = ky bao cao moi nhat cua thuoc do tai co so
```

He thong danh dau:

- Ton kho cao nhat.
- Gia VAT thap nhat.
- Ky bao cao cu hon neu cac co so khong cung ky.

Neu ky bao cao giua cac co so khong dong nhat, he thong hien canh bao de nguoi dung khong so sanh sai boi canh.

## 6. Trang Du tru - Dat hang

Nhom chuc nang Du tru - Dat hang ket noi ba ben trong quy trinh cung ung: co so y te lap nhu cau, cong ty phan hoi va giao hang, quan tri theo doi toan bo tien do. He thong khong chi ghi nhan mot don dat hang, ma theo doi day du tu de xuat so luong, gui don, cong ty xac nhan, tao dot giao, co so xac nhan thuc nhan den khi don hoan tat.

Ba trang chinh:

- `/dashboard/facility/dutru-dat-hang`: co so y te tao va quan ly don du tru dat hang.
- `/dashboard/admin/dutru-dat-hang`: quan tri theo doi tat ca don tren he thong.
- `/dashboard/dutru-dat-hang/tra-cuu`: tra cuu don bang ma don hoac QR.

### 6.1. Trang co so: `/dashboard/facility/dutru-dat-hang`

Trang nay danh cho co so y te lap don du tru gui den cong ty cung ung. Co so co the tao don nhap, chon cong ty, chon thang XNT tham chieu, them dong thuoc, xem goi y so luong dat, luu nhap, gui don, in phieu, theo doi giao hang va xac nhan thuc nhan.

#### Luong nghiep vu cua co so

```text
Tao don nhap
-> Them dong thuoc va so luong yeu cau
-> Xem goi y dat hang
-> Gui don cho cong ty
-> Theo doi cong ty phan hoi/xac nhan
-> Theo doi cac dot giao
-> Xac nhan so luong thuc nhan
-> Don hoan tat khi nhan du so luong da duoc chap nhan
```

#### Trang thai don

- **Nhap**: don dang soan, co so con duoc sua.
- **Da gui**: don da gui cho cong ty, cho cong ty xu ly.
- **Bi tu choi**: cong ty tu choi don.
- **San sang giao**: cong ty da xac nhan va san sang lap dot giao.
- **Dang giao**: da co phat sinh dot giao, co so can theo doi/xac nhan nhan hang.
- **Hoan tat**: so luong thuc nhan da dat so luong cong ty chap nhan.

#### Trang thai tung dong thuoc

- **Cho cong ty phan hoi**: dong thuoc da gui, chua co ket qua xu ly.
- **Cho xac nhan danh muc**: co so dat theo thuoc chuan nhung cong ty chua co danh muc thuoc cong ty lien ket tuong ung.
- **Cong ty xac nhan du**: cong ty chap nhan toan bo so luong yeu cau.
- **Cong ty xac nhan mot phan**: cong ty chi chap nhan mot phan so luong yeu cau.
- **Tu choi**: cong ty khong chap nhan dong thuoc.
- **Hoan tat**: dong thuoc da duoc nhan du theo so luong chap nhan.

#### Cac chi so tren don

Cach tinh:

```text
Tong so dong = so dong thuoc trong don
Tong yeu cau = tong requestedQty cua cac dong
Tong chap nhan = tong acceptedQty cua cac dong
Tong da giao = tong shippedQty cua cac dong giao hang
Tong da nhan = tong receivedQty cua cac dong thuc nhan
Con lai can nhan = max(acceptedQty - tong receivedQty, 0)
```

Y nghia:

- Tong yeu cau cho biet nhu cau co so de xuat.
- Tong chap nhan cho biet nang luc cung ung duoc cong ty xac nhan.
- Tong da giao cho biet cong ty da xuat theo dot giao bao nhieu.
- Tong da nhan cho biet co so da xac nhan thuc nhan bao nhieu.
- Con lai can nhan cho biet khoi luong con phai giao/nhan de hoan tat dong thuoc.

#### Goi y so luong dat hang

He thong ho tro goi y so luong dat dua tren bao cao XNT cua co so. Muc tieu mac dinh la du phu 2 thang.

Cach tinh nen tang:

```text
Xuat binh quan = trung binh xuat cua toi da 3 thang gan nhat tinh den thang tham chieu
Nhu cau muc tieu = xuat binh quan * 2
So luong can bo sung theo XNT = max(0, round(nhu cau muc tieu - ton cuoi moi nhat))
So luong dang ve = tong acceptedQty con chua nhan cua cac don dang mo
Goi y dat = max(0, so luong can bo sung theo XNT - so luong dang ve)
```

Du lieu goi y co cac muc tin cay:

- **Chinh thuc**: du lieu XNT da duyet.
- **Tam**: co su dung du lieu XNT chua duyet.
- **Chua lien ket**: thuoc cong ty chua lien ket thuoc chuan nen khong tinh duoc goi y.
- **Chua du du lieu**: khong co du lieu XNT de tinh.

Y nghia quan ly: goi y giup co so dat hang dua tren nhu cau su dung va ton kho thuc te, dong thoi tranh dat trung khi da co so luong dang ve tu don khac.

#### Dieu kien gui va thu hoi don

Co so chi gui duoc don khi:

```text
Don o trang thai Nhap
Co it nhat mot dong thuoc
Tat ca dong thuoc co requestedQty > 0
```

Co so chi thu hoi duoc don khi:

```text
Don o trang thai Da gui
Chua co dot giao nao
Tat ca dong thuoc van o trang thai Cho phan hoi hoac Cho xac nhan danh muc
```

#### Xac nhan thuc nhan

Khi cong ty tao dot giao, co so xac nhan so luong thuc nhan cho tat ca dong trong dot giao.

Quy tac:

```text
receivedQty khong duoc lon hon shippedQty
Neu receivedQty khac shippedQty thi phai nhap ly do chenhlech
Mot dot giao chi duoc xac nhan thuc nhan mot lan
```

Trang thai dot giao:

- **Da tao**: cong ty da tao dot giao.
- **Nhan mot phan**: co so xac nhan thuc nhan it hon so luong giao o it nhat mot dong.
- **Da nhan**: co so xac nhan nhan du so luong giao cua dot do.

Don dat hang duoc chuyen sang **Hoan tat** khi tat ca dong co so luong chap nhan lon hon 0 deu da duoc nhan du.

### 6.2. Trang quan tri: `/dashboard/admin/dutru-dat-hang`

Trang nay danh cho quan tri theo doi toan bo don du tru dat hang tren he thong. Khac voi trang co so chi nhin don cua chinh minh, trang quan tri co the loc va xem don theo co so, cong ty, trang thai, tu khoa va khoang ngay tao.

#### Bo loc quan tri

Nguoi dung co the loc theo:

- Tu khoa: ma don, ghi chu, ten/ma cong ty, ten/ma co so.
- Trang thai don.
- Co so y te.
- Cong ty.
- Khoang ngay tao don.

#### Cac chi so tong hop

Cach tinh:

```text
Tong don = so don thoa man bo loc
Tong dong = tong so dong thuoc cua cac don
Tong yeu cau = tong requestedQty cua tat ca dong
Tong chap nhan = tong acceptedQty cua tat ca dong
Tong da giao = tong shippedQty cua tat ca dong giao hang
Tong da nhan = tong receivedQty cua tat ca dong thuc nhan
Don dang mo = so don co trang thai khac Hoan tat
Don hoan tat = so don co trang thai Hoan tat
```

Y nghia:

- **Tong don** cho biet quy mo xu ly trong pham vi loc.
- **Don dang mo** la khoi luong cong viec con phai theo doi.
- **Da giao / da nhan** cho biet muc do thuc hien cung ung so voi giao nhan thuc te.
- **Don hoan tat** cho biet so don da ket thuc chu trinh.

#### Man hinh chi tiet don

Quan tri co the xem:

- Thong tin co so va cong ty.
- Ma don, trang thai, thang XNT tham chieu, ghi chu.
- QR tra cuu don.
- Danh sach dong thuoc: so luong yeu cau, chap nhan, da giao, da nhan, con lai.
- Lich su dot giao va phieu xac nhan thuc nhan.

Y nghia quan ly: trang quan tri giup theo doi diem nghen trong chuoi cung ung, vi du don da gui nhung cong ty chua phan hoi, don da san sang giao nhung chua giao, hoac da giao nhung co so chua xac nhan nhan hang.

### 6.3. Trang tra cuu QR: `/dashboard/dutru-dat-hang/tra-cuu`

Trang tra cuu QR cho phep xem nhanh thong tin mot don du tru dat hang bang ma don hoac duong dan QR. Day la man hinh chi doc, dung de doi chieu khi giao nhan, kiem tra trang thai hoac chia se thong tin don cho cac ben co quyen.

Nguoi dung co the:

- Nhap ma don de tra cuu.
- Quet QR cua don.
- Mo duong dan QR co tham so token.

#### Bao mat va phan quyen QR

QR khong chi la duong dan thuong. He thong tao token co chu ky HMAC SHA-256 tu `orderId` va phien ban token. Khi tra cuu, token duoc kiem tra chu ky; neu QR bi sua doi hoac khong hop le, he thong bao loi.

Quyen xem:

- Admin xem duoc moi don.
- Co so chi xem duoc don cua chinh co so.
- Cong ty chi xem duoc don cua cong ty minh.

#### Noi dung tra cuu

Trang tra cuu hien:

- Thong tin don: ma don, co so, cong ty, trang thai, thang XNT tham chieu, thoi diem tao/gui/dong/cap nhat.
- Tong hop giao nhan: tong so dong, tong yeu cau, tong chap nhan, tong da giao, tong da nhan.
- Chi tiet thuoc: thuoc cong ty, thuoc chuan, don vi tinh, so luong yeu cau, chap nhan, da giao, da nhan, trang thai dong.
- Lich su giao nhan: tung dot giao, thoi gian giao, ghi chu cong ty, so luong giao, so luong nhan va ly do chenhlech neu co.

#### Nhan dien tinh trang giao nhan

Cach tinh nhan trang thai tong hop:

```text
Neu tong chap nhan > 0 va tong da nhan >= tong chap nhan: Hoan tat
Neu tong da nhan > 0 nhung chua du tong chap nhan: Da nhan mot phan
Neu tong da giao > 0 nhung chua co thuc nhan: Dang giao
Neu chua co giao: Chua giao
```

Y nghia quan ly: QR giup doi chieu nhanh tai thoi diem giao nhan, giam phu thuoc vao ban in va giup cac ben cung xem mot ban ghi thong nhat.

## 7. Trang Tro ly AI va Quan tri AI

Phan AI trong phan mem duoc thiet ke nhu mot lop ho tro ra quyet dinh va kiem tra du lieu. AI khong thay nguoi dung phe duyet, sua, gui hay chap nhan du lieu; AI chi tong hop, phan tich, canh bao va dua goi y dua tren du lieu ma he thong cung cap qua cac cong cu da phan quyen.

Ba nhom chuc nang chinh:

- **Tro ly AI**: hoi dap ve ton kho, bao cao, anh xa danh muc, rui ro cung ung va du lieu bat thuong.
- **AI kiem tra ho so**: ho tro co so kiem tra bao cao ton kho va anh xa danh muc truoc khi tiep tuc xu ly.
- **Quan tri AI**: cau hinh bat/tat, quota, provider, fallback, tool va theo doi chi phi/su dung.

### 7.1. Tro ly AI trong he thong

Tro ly AI xuat hien nhu mot hop thoai chat. Nguoi dung co the hoi cac cau nhu:

- "Co thuoc nao co nguy co thieu hang?"
- "Tom tat tinh hinh ton kho thang nay."
- "Co dong bao cao nao bat thuong?"
- "Co so cua toi con van de anh xa danh muc nao?"
- "Lap bao cao ngan cho lanh dao ve rui ro cung ung."

AI tra loi bang tieng Viet, uu tien ngan gon, co bang chung du lieu neu cau hoi lien quan den so lieu. Moi cau tra loi deu mang tinh ho tro kiem tra va tong hop; nguoi dung van phai xac nhan truoc khi thuc hien thao tac nghiep vu.

### 7.2. AI kiem tra ho so

Che do kiem tra AI dung cho tai khoan co so trong cac man hinh nghiep vu lien quan:

- `facility_reports`: kiem tra bao cao ton kho.
- `facility_mappings`: kiem tra anh xa danh muc thuoc.

Ket qua kiem tra duoc trinh bay theo huong:

- Loi can xu ly.
- Canh bao nen kiem tra.
- Goi y tiep theo.

Y nghia: AI giup can bo co so phat hien som loi du lieu truoc khi gui/hoan tat quy trinh, vi du ton kho lech can doi, xuat vuot ton, thieu thong tin anh xa, gia bang 0 hoac dong danh muc co kha nang trung lap.

### 7.3. Quy trinh AI xu ly mot yeu cau

Khi nguoi dung goi AI, he thong xu ly theo chuoi kiem soat sau:

```text
Nguoi dung gui cau hoi
-> He thong chuan hoa yeu cau
-> Kiem tra dang nhap, vai tro va surface
-> Kiem tra AI co duoc bat khong
-> Kiem tra quota ngay cua nguoi dung
-> Kiem tra cache cau tra loi
-> Chay cac tool du lieu duoc phep theo vai tro
-> Chon model primary hoac fallback
-> Tao prompt kem bang chung tu tool
-> Goi provider AI
-> Ghi log su dung, token, chi phi uoc tinh, tool va trang thai
-> Tra cau tra loi cho nguoi dung
```

Neu ket qua da co trong cache, he thong tra lai cau tra loi nhanh hon va van ghi nhan log voi `cacheHit = true`.

### 7.4. Phan quyen AI theo vai tro

Trong MVP, AI ho tro hai vai tro chinh:

- **ADMIN**: hoi dap va phan tich toan he thong.
- **FACILITY**: hoi dap va kiem tra trong pham vi co so dang dang nhap.

Vai tro `COMPANY` chua duoc cap quyen su dung AI Agent trong MVP.

Che do `review` chi danh cho `FACILITY`. Admin dung chu yeu che do chat va cac cong cu tong hop/toan he thong.

### 7.5. Cac cong cu AI cho Admin

Admin co the duoc cap cac tool sau:

- **Tong quan dashboard**: tong hop gia tri ton kho, so dong bao cao, co so active va cac thang gan day.
- **Rui ro cung ung**: phan tich nguy co dut hang, ton chet va nhu cau dua tren bao cao ton kho.
- **Trang thai nop bao cao**: kiem tra co so da nop/chua nop bao cao theo thang.
- **Ton dong anh xa**: dem cac dong danh muc cho anh xa, cho duyet, bi tu choi hoac ngoai danh muc.
- **Bat thuong bao cao**: tim dong ton kho lech can doi, xuat vuot ton, chua anh xa hoac gia bang 0.
- **Truy van database an toan**: tra loi cau hoi linh hoat bang cac safe views va bo kiem tra truy van.

Y nghia quan ly: Admin co the hoi AI bang ngon ngu tu nhien nhung AI chi duoc tra loi dua tren du lieu tool da tra ve, giup giam rui ro suy doan so lieu.

### 7.6. Cac cong cu AI cho co so

Co so co the duoc cap cac tool sau:

- **Bao cao cua co so**: tong hop so dong, gia tri ton kho va lan nop bao cao gan nhat cua co so dang dang nhap.
- **Bat thuong cua co so**: tim cac bat thuong trong bao cao ton kho cua chinh co so.
- **Van de anh xa cua co so**: tong hop dong cho anh xa, thieu thong tin, bi tu choi va ngoai danh muc.
- **Rui ro cung ung cua co so**: phan tich nguy co dut hang va ton chet trong pham vi co so.
- **Kiem tra evidence bao cao**: kiem tra nhanh du lieu tu man hinh truoc khi doi chieu ban ghi da luu.
- **Kiem tra bao cao da luu**: kiem tra bat thuong tren bao cao ton kho da luu theo thang.
- **Kiem tra anh xa danh muc**: kiem tra dong anh xa thieu thong tin, trung ten va bi tu choi.

Y nghia nghiep vu: Co so co mot cong cu ho tro tu ra soat du lieu truoc khi gui len cap quan ly, giam so lan bi tra lai do loi dinh dang hoac bat thuong ro rang.

### 7.7. Trang quan tri AI: `/dashboard/admin/ai-agent`

Trang nay dung de quan tri toan bo chinh sach van hanh AI.

#### Cau hinh he thong

Admin co the:

- Bat/tat AI toan he thong.
- Bat/tat che do chat.
- Bat/tat che do review.
- Bat/tat fallback.
- Cau hinh quota theo vai tro va che do.
- Xem provider primary/fallback dang cau hinh va model dang dung.
- Chay health check de kiem tra provider AI co API key va phan hoi duoc hay khong.

Quota mac dinh lay tu cau hinh moi truong:

```text
adminChatPerDay: 80
adminReviewPerDay: 40
facilityChatPerDay: 30
facilityReviewPerDay: 15
```

Admin co the cau hinh gioi han ngay tu 0 den 1000 luot.

#### Quan ly nguoi dung

Admin co the cau hinh chinh sach rieng cho tung nguoi dung:

- Bat/tat AI cho tai khoan.
- Gioi han chat moi ngay.
- Gioi han review moi ngay.
- Cho phep fallback hay khong.
- Ghi chu chinh sach.

Neu nguoi dung khong co chinh sach rieng, he thong dung cau hinh mac dinh theo vai tro.

#### Quan ly tool

Admin co the bat/tat tung tool AI theo vai tro `ADMIN` hoac `FACILITY`. Khi mot tool bi tat, AI khong duoc dung tool do de tra loi, ngay ca khi cau hoi cua nguoi dung co lien quan.

Y nghia quan tri: phan mem khong de AI tu do doc moi du lieu, ma dieu khien bang danh sach tool, role, surface va policy ro rang.

### 7.8. Trang thong ke su dung AI: `/dashboard/admin/ai-usage`

Trang nay giup quan tri theo doi AI dang duoc dung nhu the nao, co ton chi phi khong, co loi hay het quota khong.

Bo loc gom:

- Khoang ngay.
- Nguoi dung.
- Vai tro.
- Che do: chat hoac kiem tra.
- Model.
- Trang thai: thanh cong, loi, het quota.
- Tool.
- Cache hit.
- Fallback.
- Ma loi.
- Co bao gom health check hay khong.

#### Cac chi so tong hop

Cach tinh:

```text
Tong request = so log AI_AGENT trong khoang loc
Thanh cong = so log co status = success
Loi = so log co status = error
Het quota = so log co status = quota_exceeded
Cache hit = so log co cacheHit = true
Fallback = so log co usedFallback = true
Input tokens = tong inputTokens
Output tokens = tong outputTokens
Chi phi uoc tinh = tong estimatedCostUsd
Nguoi dung duy nhat = so userId khac nhau trong log
```

#### Chi phi uoc tinh

Chi phi duoc tinh theo bang don gia theo model neu model co cau hinh gia:

```text
Chi phi input = inputTokens / 1.000.000 * don gia input
Chi phi output = outputTokens / 1.000.000 * don gia output
Chi phi uoc tinh = chi phi input + chi phi output
```

Neu provider tra ve token thuc te, he thong dung token do. Neu khong, he thong uoc tinh token theo do dai van ban:

```text
token uoc tinh = ceil(so ky tu / 4)
```

#### Cac goc nhin thong ke

Trang AI Usage gom cac goc nhin:

- Theo ngay.
- Theo vai tro.
- Theo che do.
- Theo model.
- Top nguoi dung.
- Danh sach request gan day.

Moi dong gan day hien nguoi dung, vai tro, mode, surface, model, trang thai, fallback, cache, token, chi phi uoc tinh, ma loi, canh bao va tool da dung.

### 7.9. Model, fallback va health check

He thong co provider primary va fallback. Mac dinh primary la Google/Gemini, fallback tuy cau hinh server. Nguoi dung chat co the chon:

- Mac dinh he thong.
- Gemini Flash.
- DeepSeek Flash.

Fallback chi duoc dung khi:

```text
Nguoi dung la ADMIN
Chinh sach cho phep fallback
Provider fallback da cau hinh API key
Tac vu la phan tich sau hoac bao cao lanh dao
Nguoi dung khong chon model cu the khac mac dinh
```

Health check goi provider voi mot prompt ngan de do:

- Provider/model dang dung.
- Da cau hinh API key hay chua.
- Do tre phan hoi.
- Trang thai thanh cong hay ma loi.

### 7.10. Bao mat va gioi han cua AI

AI trong he thong duoc gioi han boi cac nguyen tac:

- Khong tu nhan da ghi, sua, gui, phe duyet du lieu.
- Khong dua tu van dieu tri ca nhan hoa.
- Khong thay the quy trinh phe duyet chinh thuc.
- Chi ket luan dua tren tool/context duoc cung cap.
- Khi truy van database, chi dung safe views va truy van da qua verifier.
- Neu thieu du lieu, AI phai noi ro thieu du lieu nao va khong doan.
- Neu cau hoi so lieu khong ro mien du lieu, AI phai hoi lai de lam ro.

Y nghia quan ly: AI duoc dua vao he thong nhu mot cong cu ho tro co kiem soat, co log, co quota, co phan quyen va co gioi han an toan.

## 8. Diem can nhan manh khi thuyet trinh

Khi gioi thieu voi lanh dao, co the nhan manh 7 thong diep:

1. **He thong bien bao cao ton - nhap - xuat thanh cong cu dieu hanh.**  
   Khong chi luu du lieu, phan mem tu dong tong hop thanh chi so, bieu do, ban do va danh sach can xu ly.

2. **Moi chi so deu co cong thuc ro rang.**  
   Gia tri xuat dung `xuat * giaVat`, ton kho dung `thanhTienTonCuoi`, do phu dung `tonCuoi / nhu cau binh quan`, ABC dung nguong 80% - 95% - 100%.

3. **He thong ho tro phat hien som rui ro.**  
   Cac nhom het hang, sap het hang, ton khong co nhu cau, hop dong sap het han, chenh lech gia va thuoc hiem deu duoc dua len man hinh rieng.

4. **Co the di tu tong quan den chi tiet.**  
   Tu dashboard toan nganh, nguoi dung co the loc theo don vi, ky bao cao, nhom thuoc, thuoc cu the, nha cung ung hoac goi thau.

5. **Du lieu phuc vu ca quan ly va nghiep vu.**  
   Lanh dao co man hinh tong quan de ra quyet dinh; can bo nghiep vu co bang chi tiet va cong thuc de ra soat, dieu chuyen, mua sam va hoan thien du lieu.

6. **Quy trinh du tru - dat hang duoc theo doi den tan khau giao nhan.**  
   Tu goi y so luong dat, don nhap, gui don, cong ty xac nhan, tao dot giao den co so xac nhan thuc nhan, moi buoc deu co trang thai va so lieu doi chieu ro rang.

7. **AI ho tro phan tich nhung van duoc kiem soat.**  
   AI giup hoi dap, tom tat va kiem tra du lieu, nhung moi cau tra loi deu dua tren tool da phan quyen, co quota, co log, co cache, co gioi han role va khong thay the quy trinh phe duyet.

## 9. Goi y loi thuyet trinh ngan

Co the mo dau nhu sau:

> Phan mem nay duoc xay dung de giai quyet bai toan quan ly duoc tren toan he thong: chung ta khong chi can biet tung co so bao cao gi, ma can biet toan nganh dang ton bao nhieu, thuoc nao co nguy co thieu, hop dong nao sap het han, nha cung ung nao chiem ty trong lon, va tien trinh mua sam cua tung goi thau dang o buoc nao.

Khi gioi thieu dashboard:

> Trang dashboard admin la man hinh dieu hanh trung tam. O day, lanh dao co the xem tong quan ton kho, co cau su dung, canh bao cung ung, dau thau, ABC va thuoc hiem. Cac bieu do khong phai so lieu minh hoa, ma duoc tinh truc tiep tu bao cao ton - nhap - xuat va danh muc chuan cua he thong.

Khi gioi thieu canh bao cung ung:

> Diem quan trong cua tab Cung ung la he thong khong chi bao con bao nhieu, ma tinh duoc con du dung bao lau. Nhu cau duoc lay theo trung binh xuat cua 1, 3 hoac 6 ky gan nhat; do phu ton kho bang ton cuoi chia cho nhu cau binh quan. Tu do he thong tach ro thuoc da het, thuoc sap het va thuoc ton nhung khong co nhu cau.

Khi gioi thieu ABC:

> Phan tich ABC giup chung ta tap trung vao nhom thuoc co tac dong tai chinh lon nhat. Thuoc duoc sap xep theo gia tri tieu thu, tinh bang xuat nhan gia VAT. Nhom A la phan tao nen khoang 80% gia tri dau tien, nhom B den 95%, nhom C la phan con lai.

Khi gioi thieu tra cuu mua sam:

> Trang tra cuu mua sam cho phep theo doi tron ven tien trinh cua mot goi thau, tu ke hoach lua chon nha thau, thong bao moi thau den ket qua lua chon nha thau va ket qua phan lo. Nho do viec giam sat tien do mua sam khong con phai tra cuu roi rac tren nhieu bang.

Khi gioi thieu tra cuu ton kho:

> Trang tra cuu ton kho tra loi nhanh ba cau hoi thuc te: mot thuoc dang con o dau, mot co so dang con nhung thuoc nao, va cung mot thuoc thi co so nao con nhieu hon hoac co gia VAT thap hon. Du lieu la snapshot moi nhat da duyet, nen phu hop cho dieu hanh hang ngay.

Khi gioi thieu du tru - dat hang:

> Module du tru - dat hang giup khep kin quy trinh tu nhu cau cua co so den giao nhan thuc te. Co so lap don dua tren goi y tu bao cao XNT, cong ty xac nhan so luong co the cung ung va tao cac dot giao, sau do co so xac nhan thuc nhan. Quan tri co the theo doi toan bo don theo co so, cong ty, trang thai va so luong yeu cau - chap nhan - da giao - da nhan.

Khi gioi thieu AI:

> AI trong phan mem khong phai la mot hop chat tu do, ma la tro ly co phan quyen va co kiem soat. Nguoi dung co the hoi ve ton kho, bao cao, anh xa, rui ro cung ung va du lieu bat thuong; AI chi duoc tra loi dua tren cac cong cu du lieu duoc cap phep. Quan tri co the bat/tat AI, dat quota, quan ly tool theo vai tro, kiem tra provider va theo doi toan bo luot dung, token, chi phi uoc tinh, loi va fallback.
