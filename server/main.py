import uvicorn
import cv2
import numpy as np
import mediapipe as mp
import sqlite3
import pickle
import os
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from keras_facenet import FaceNet
from typing import List
from ultralytics import YOLO 

GLOBAL_CACHE = { "vectors": None, "names": [] }
DB_PATH = "database/users.db"
MODEL_PATH = "mask_detector.pt" 

RECOGNITION_THRESHOLD = 0.70
DUPLICATE_THRESHOLD = 0.70

print("⏳ Đang tải AI...")
embedder = FaceNet()
mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(min_detection_confidence=0.5)

mask_model = None
try:
    if os.path.exists(MODEL_PATH):
        mask_model = YOLO(MODEL_PATH)
        print("✅ Đã tải YOLO Mask Detector")
    else:
        print("⚠️ Không tìm thấy file model YOLO.")
except Exception as e:
    print(f"❌ Lỗi YOLO: {e}")

def init_db():
    if not os.path.exists("database"): os.makedirs("database")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, vectors BLOB)''')
    c.execute('''CREATE TABLE IF NOT EXISTS history 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  name TEXT, 
                  time TEXT)''')
    conn.commit()
    conn.close()

def reload_cache():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT name, vectors FROM users")
    rows = c.fetchall()
    conn.close()
    all_vectors, all_names = [], []
    for name, blob in rows:
        vectors_list = pickle.loads(blob)
        for vec in vectors_list:
            all_vectors.append(vec)
            all_names.append(name)
    if len(all_vectors) > 0:
        GLOBAL_CACHE["vectors"] = np.array(all_vectors)
        GLOBAL_CACHE["names"] = all_names
        print(f"✅ Đã load {len(all_names)} khuôn mặt vào bộ nhớ.")
    else:
        GLOBAL_CACHE["vectors"] = None
        GLOBAL_CACHE["names"] = []
        print("⚠️ Database trống.")

def save_user_to_db(name, vectors):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    vectors_blob = pickle.dumps(vectors)
    try:
        c.execute("INSERT OR REPLACE INTO users (name, vectors) VALUES (?, ?)", (name, vectors_blob))
        conn.commit()
    finally:
        conn.close()
    reload_cache()

def save_checkin_to_history(name, time_str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO history (name, time) VALUES (?, ?)", (name, time_str))
        conn.commit()
    finally:
        conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    reload_cache()
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def check_mask_yolo(image_cv2):
    if mask_model is None: 
        return False

    results = mask_model(image_cv2, conf=0.25, verbose=False)

    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            cls_name = mask_model.names[cls_id]

            if 'mask' in cls_name:
                return True 
                
    return False

def process_image_to_vector(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None: return None
    
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_detection.process(image_rgb)
    if not results.detections: return None

    detection = results.detections[0]
    bboxC = detection.location_data.relative_bounding_box
    h, w, _ = image.shape
    x, y = int(bboxC.xmin * w), int(bboxC.ymin * h)
    width, height = int(bboxC.width * w), int(bboxC.height * h)
    
    x, y = max(0, x), max(0, y)
    
    face_crop = image_rgb[y:y+height, x:x+width]
    if face_crop.size == 0: return None
    
    face_crop = cv2.resize(face_crop, (160, 160))
    embeddings = embedder.embeddings(np.expand_dims(face_crop, axis=0))
    return embeddings[0]


@app.post("/check-mask/")
async def check_mask_api(file: UploadFile = File(...)):
    content = await file.read()
    nparr = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None: return {"mask": False}
    
    is_masked = check_mask_yolo(image)
    return {"mask": is_masked}

@app.delete("/reset-database/")
def reset_database():
    if os.path.exists(DB_PATH): os.remove(DB_PATH)
    init_db()
    reload_cache()
    return {"message": "Reset done"}

@app.post("/register/")
async def register(name: str = Form(...), files: List[UploadFile] = File(...)):
    new_vectors = []
    for file in files:
        content = await file.read()
        nparr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if check_mask_yolo(img):
            raise HTTPException(400, "Ảnh có khẩu trang! Vui lòng thử lại.")
            
        vec = process_image_to_vector(content)
        if vec is not None: new_vectors.append(vec)
    
    if not new_vectors:
        raise HTTPException(400, "Không tìm thấy khuôn mặt rõ ràng.")

    if GLOBAL_CACHE["vectors"] is not None:
        distances = np.linalg.norm(GLOBAL_CACHE["vectors"] - new_vectors[0], axis=1)
        min_dist = np.min(distances)
        
        print(f"🔍 Đăng ký - Khoảng cách nhỏ nhất tìm thấy: {min_dist:.4f}")

        if min_dist < DUPLICATE_THRESHOLD:
            existing_name = GLOBAL_CACHE["names"][np.argmin(distances)]
            if existing_name != name:
                raise HTTPException(409, f"Khuôn mặt đã tồn tại: {existing_name}")

    save_user_to_db(name, new_vectors)
    return {"message": f"Đăng ký thành công: {name}"}

@app.post("/recognize/")
async def recognize(file: UploadFile = File(...)):
    content = await file.read()
    
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if check_mask_yolo(img):
        return {"user": "Unknown", "match": False, "detail": "Vui lòng bỏ khẩu trang!"}

    input_vec = process_image_to_vector(content)
    if input_vec is None: 
        return {"user": "Unknown", "match": False, "detail": "Không tìm thấy mặt"}

    if GLOBAL_CACHE["vectors"] is None:
        return {"user": "Unknown", "match": False}

    diff = GLOBAL_CACHE["vectors"] - input_vec
    distances = np.linalg.norm(diff, axis=1)
    min_idx = np.argmin(distances)
    min_dist = distances[min_idx]
    
    name_match = GLOBAL_CACHE["names"][min_idx]
    
    print(f"📸 Điểm danh: {name_match} - Distance: {min_dist:.4f} (Ngưỡng: {RECOGNITION_THRESHOLD})")

    if min_dist < RECOGNITION_THRESHOLD:
        time_now = datetime.now().strftime("%H:%M:%S - %d/%m/%Y")
        save_checkin_to_history(name_match, time_now)
        
        return {
            "user": name_match, 
            "match": True,
            "time": time_now
        }
    
    return {"user": "Unknown", "match": False}

@app.get("/history/")
def get_history():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM history ORDER BY id DESC")
    data = c.fetchall()
    conn.close()
    
    history_list = []
    for row in data:
        history_list.append({
            "id": row[0],
            "name": row[1],
            "time": row[2]
        })
    return history_list

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)