import sqlite3
import pickle
import numpy as np
import os

np.set_printoptions(suppress=True, precision=4, linewidth=100)

DB_PATH = "database/users.db"

def inspect_database():
    if not os.path.exists(DB_PATH):
        print(f"❌ Lỗi: Không tìm thấy file '{DB_PATH}'")
        print("👉 Bạn cần chạy file main.py ít nhất 1 lần để tạo DB.")
        return

    print(f"\n{'='*60}")
    print(f"🕵️  KIỂM TRA DỮ LIỆU BÊN TRONG FILE: {DB_PATH}")
    print(f"{'='*60}\n")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT name, vectors FROM users")
        rows = cursor.fetchall()

        if len(rows) == 0:
            print("⚠️  Database đang trống (Chưa có ai đăng ký).")
        else:
            for i, row in enumerate(rows):
                name = row[0] 
                blob_data = row[1] 
                vectors_list = pickle.loads(blob_data)
                
                print(f"👤 USER {i+1}: {name.upper()}")
                print(f"💾 Số lượng khuôn mặt đã học: {len(vectors_list)}")
                print("-" * 50)

                for j, vec in enumerate(vectors_list):
                    print(f"   ➤ Vector mẫu số {j+1} (512 chiều):")
                    
                    print(f"     [{vec[0]:.4f}, {vec[1]:.4f}, {vec[2]:.4f}, {vec[3]:.4f}, {vec[4]:.4f} ... {vec[-1]:.4f}]")
                    
                    # print(vec) 
                    
                    print("") 

                print("="*60)

    except sqlite3.OperationalError:
        print("❌ Lỗi: Bảng 'users' chưa được tạo.")
    except Exception as e:
        print(f"❌ Lỗi không xác định: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect_database()