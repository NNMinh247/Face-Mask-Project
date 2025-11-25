from keras_facenet import FaceNet
from tensorflow.keras.utils import plot_model
import os

embedder = FaceNet()
model = embedder.model 
print(model.summary())

try:
    plot_model(model, to_file='facenet_architecture.png', show_shapes=True, show_layer_names=True)
    print("✅ Đã lưu sơ đồ vào file 'facenet_architecture.png'")
except Exception as e:
    print("⚠️ Không thể vẽ ảnh (cần cài Graphviz), nhưng đã in text ở trên.")

save_path = "facenet_model.h5"
model.save(save_path)
print(f"\n✅ Đã lưu xong! File nằm tại: {os.path.abspath(save_path)}")
print("👉 HƯỚNG DẪN XEM:")
print("1. Truy cập trang web: https://netron.app/")
print(f"2. Kéo file '{save_path}' thả vào trang web đó.")
print("3. Bạn sẽ thấy sơ đồ cực đẹp và chi tiết.")