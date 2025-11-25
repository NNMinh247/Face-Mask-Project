# Face-Mask-Project — Hướng dẫn nhanh (Tiếng Việt)

Repository này chứa hệ thống nhận diện khuôn mặt và phát hiện khẩu trang, gồm backend Python (FastAPI) và frontend React (Vite).

## Yêu cầu
- Windows (ví dụ lệnh sử dụng PowerShell)
- Python 3.8+ (khuyến nghị 3.10/3.11). Nếu dùng Python 3.12 có thể cần điều chỉnh một số gói nhị phân.
- Node.js (16+) và `npm`

## Cài đặt & chạy nhanh (PowerShell)
Mở hai cửa sổ PowerShell: một cho server, một cho client.

### 1) Backend (server)
1. Vào thư mục `server`:

```powershell
cd .\server
```

2. Tạo và kích hoạt virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Nếu PowerShell chặn script, mở quyền (chạy 1 lần với quyền Admin):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

3. Cài dependencies:

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

4. Đảm bảo các file model có trong `server/`:
- `mask_detector.pt` (YOLO mask detector)
- `facenet_model.h5` (FaceNet embedding)

Nếu các file lớn và không có trong git, sao chép chúng vào `server/` trước khi chạy.

5. Chạy server:

```powershell
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server chạy tại: `http://127.0.0.1:8000`

Các endpoint chính:
- `POST /register/` — đăng ký người dùng (form + file ảnh)
- `POST /recognize/` — nhận diện khuôn mặt (file ảnh)
- `POST /check-mask/` — kiểm tra nhanh khẩu trang (trả về `{ "mask": true|false }`)
- `GET /history/` — lịch sử điểm danh
- `DELETE /reset-database/` — reset database

### 2) Frontend (client)
Mở cửa sổ PowerShell thứ hai, vào thư mục `client`:

```powershell
cd .\client
npm install
npm run dev
```

Mặc định Vite phục vụ ứng dụng ở `http://localhost:5173` (hoặc port hiển thị trong terminal).

Frontend gọi backend tại `http://localhost:8000` (xem `client/src/services/api.js`). Nếu server chạy ở host/port khác, cập nhật `API_URL` tại file đó.

## Script tiện lợi (PowerShell)
Tôi đã thêm các script PowerShell vào `scripts/` để dễ khởi động trong Windows:

- `scripts/run-server.ps1` — tạo/activate venv, cài dependencies (nếu cần) và chạy uvicorn
- `scripts/run-client.ps1` — `npm install` và `npm run dev` trong thư mục `client`
- `scripts/run-all.ps1` — mở hai cửa sổ PowerShell và chạy lần lượt server + client

Bạn có thể chạy file `scripts/run-all.ps1` từ PowerShell ở gốc repo:

```powershell
cd <đường_dẫn_repo>
.\scripts\run-all.ps1
```

> Lưu ý: nếu PowerShell chặn thực thi script, bật `Set-ExecutionPolicy` như mô tả ở trên.

## Lệnh hữu ích
- Reset database (gọi endpoint):

```powershell
curl -X DELETE http://127.0.0.1:8000/reset-database/
```

- Kiểm tra DB local:

```powershell
python check_db.py
```

## Khắc phục lỗi thường gặp
- Lỗi khi cài các gói nhị phân (ví dụ: `numpy`, `h5py`, `opencv-python`) → thử nâng pip và cài lại phiên bản tương thích:

```powershell
pip install --upgrade pip
pip install --upgrade --force-reinstall numpy==1.26.4 h5py pillow
```

- Nếu client không khởi động do thiếu package, chạy `npm install` trong `client/`.
- Nếu thiếu file model (`mask_detector.pt` hoặc `facenet_model.h5`), sao chép chúng vào `server/`.

## Cấu trúc ngắn của project

```
Face-Mask-Project/
├─ client/                # Frontend React
│  └─ src/
│     ├─ components/CameraCapture.jsx
│     └─ services/api.js
├─ server/                # Backend FastAPI + models
│  ├─ main.py
│  ├─ check_db.py
│  └─ database/
├─ scripts/               # PowerShell helper scripts
└─ README.md
```

## Muốn tôi làm tiếp?
- Tôi có thể đổi `README.md` chính thức và commit giúp bạn.
- Hoặc sửa nội dung ngắn gọn hơn nếu bạn cần.
