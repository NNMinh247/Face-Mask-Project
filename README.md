Hướng dẫn Cài đặt & Chạy

Yêu cầu: Máy đã cài Node.js và Python (Khuyên dùng Python 3.12 để tương thích tốt nhất với thư viện AI).

Bước 1: Cài đặt Backend (Server)

Mở Terminal tại thư mục server `:cd server`

1. Tạo môi trường ảo
`python -m venv venv`

2. Kích hoạt môi trường
Windows:
`..\venv\Scripts\activate`

3. Cài đặt thư viện
`pip install -r requirements.txt`

Lưu ý: Nếu gặp lỗi thư viện trên Python 3.12+, hãy chạy lệnh fix: `pip install --upgrade --force-reinstall numpy==1.26.4 h5py pillow pydantic pydantic-core optree`

Bước 2: Cài đặt Frontend (Client)
Mở một Terminal mới tại thư mục client: `cd client`

`npm install`

▶️ Hướng dẫn Sử dụngBạn cần chạy song song 2 Terminal.

1: Chạy Server Python `cd server`

Đảm bảo đã activate venv
`python -m uvicorn main:app`

Server sẽ chạy tại: http://127.0.0.1:8000Terminal 

2: Chạy Client Reactcd client
`npm run dev`

```
Web sẽ chạy tại: http://localhost:5173📂 Cấu trúc thư mụceKYC_Project/
├── client/                 # Giao diện ReactJS
│   ├── src/
│   │   ├── components/     # CameraCapture.jsx (Logic AI Frontend)
│   │   ├── services/       # api.js (Gọi về Server)
│   │   └── App.jsx         # Logic chính
│   └── ...
├── server/                 # Xử lý AI Python
│   ├── database/           # Chứa file users.db
│   ├── main.py             # API Server (FastAPI)
│   ├── check_db.py         # Tool kiểm tra dữ liệu
│   └── requirements.txt    # Danh sách thư viện
└── README.md
```
🐛 Khắc phục lỗi thường gặp
1. Lỗi 422 Unprocessable Entity khi đăng kýNguyên nhân: Sai định dạng gửi dữ liệu.Khắc phục: Đảm bảo code api.js đã xử lý mảng ảnh đúng và main.py nhận tham số Form(...).
2. Camera không hiện hoặc lỗi MediaPipeNguyên nhân: Chưa cài gói npm.Khắc phục: Vào thư mục client chạy npm install @mediapipe/face_mesh @mediapipe/camera_utils @mediapipe/drawing_utils.
3. Lỗi numpy / h5py bên serverNguyên nhân: Xung đột phiên bản Python mới.Khắc phục: Xem lại lệnh fix lỗi ở Bước 1.

Check CSDL:
`python check_db.py`