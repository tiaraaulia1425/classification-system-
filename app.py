import os
import json
import base64
import io
import random

import numpy as np
from PIL import Image
import tensorflow as tf
from flask import Flask, render_template, request, jsonify

from models.model_utils import predict_flower, cat_to_name

# =============================
# BASIC CONFIG
# =============================
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
tf.get_logger().setLevel('ERROR')

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
# os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(ROOT_DIR, 'models')

MODEL_FILE = os.path.join(MODELS_DIR, 'flower_classification_model_MobileNetV2.keras')

# =============================
# LOAD MODEL (TIDAK DIUBAH)
# =============================
model = tf.keras.models.load_model(MODEL_FILE)

# =============================
# LOAD METADATA
# =============================
with open(os.path.join(MODELS_DIR, 'flower_metadata.json'), 'r', encoding='utf-8') as f:
    flower_metadata = json.load(f)

# =============================
# LOAD CLASS NAMES (PERBAIKAN: GUNAKAN MAPPING DARI TRAINING)
# =============================
BASE_DIR = "../dataset"
TRAIN_DIR = os.path.join(BASE_DIR, "train")

# PENTING: Load class_indices yang sama dengan saat training
# class_indices.json berisi mapping {index: folder_name} yang diurutkan secara alfabetis
try:
    with open(os.path.join(MODELS_DIR, 'class_indices.json'), 'r') as f:
        class_names = json.load(f)
        # Konversi key dari string ke integer
        class_names = {int(k): v for k, v in class_names.items()}
    print(f"✅ Loaded {len(class_names)} classes from class_indices.json (training mapping)")
except FileNotFoundError:
    # Fallback: buat mapping alfabetis dari folder dataset
    if os.path.isdir(TRAIN_DIR):
        folders = sorted([
            f for f in os.listdir(TRAIN_DIR)
            if os.path.isdir(os.path.join(TRAIN_DIR, f))
        ])
        class_names = {i: folder for i, folder in enumerate(folders)}
        print(f"⚠️ class_indices.json not found. Created mapping from dataset folder (alfabetis)")
    else:
        # Fallback terakhir: buat mapping alfabetis dari cat_to_name keys
        keys_sorted = sorted(cat_to_name.keys())  # Urutan alfabetis (string)
        class_names = {i: k for i, k in enumerate(keys_sorted)}
        print(f"⚠️ No dataset folder. Created mapping from cat_to_name.json (alfabetis)")

# =============================
# HELPERS
# =============================
def allowed_file(filename):
    """Return True if the filename has an allowed image extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {
        'png', 'jpg', 'jpeg', 'bmp'
    }


def get_flower_metadata(flower_name, confidence):
    """
    SOLUSI AMAN & MINIMAL:
    Ambil metadata BERDASARKAN NAMA bunga hasil prediksi
    """

    class_id = next(
        (k for k, v in flower_metadata.items()
         if v["name"].lower() == flower_name.lower()),
        None
    )

    if not class_id:
        return None

    data = flower_metadata[class_id]

    if confidence >= 0.8:
        desc = data["description"]["high_confidence"]
    elif confidence >= 0.5:
        desc = data["description"]["medium_confidence"]
    else:
        desc = data["description"]["low_confidence"]

    return {
        "id": class_id,
        "name": data["name"],
        "scientific_name": data["scientific_name"],
        "physical_characteristics": data["physical_characteristics"],
        "habitat": data["habitat"],
        "benefits_or_meaning": data["benefits_or_meaning"],
        "dynamic_description": desc
    }

# =============================
# ROUTES
# =============================
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/beranda')
def index_home():
    return render_template('index.html')


@app.route('/clasify')
def clasify_page():
    return render_template('clasify.html')


@app.route('/search')
def search_page():
    return render_template('search.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'})

    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'Invalid file'})

    try:
        img = Image.open(file.stream).convert('RGB')
        img_array = np.array(img)

        flower_name, confidence, _, _, is_flower, quality_info = predict_flower(
            model,
            cat_to_name,
            class_names,
            img_array=img_array,
            check_quality=True,
            is_camera=False
        )

        buffered = io.BytesIO()
        img.save(buffered, format="JPEG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()

        # Jika kualitas gambar buruk
        if not quality_info["is_valid"]:
            return jsonify({
                "success": True,
                "is_flower": False,
                "mode": "upload",
                "predicted_name": flower_name,
                "confidence": float(confidence),
                "confidence_percent": f"{confidence:.2%}",
                "image_data": f"data:image/jpeg;base64,{img_base64}",
                "warning": f"Kualitas gambar tidak memadai: {quality_info['reason']}. Silakan upload gambar dengan kualitas yang lebih baik.",
                "quality_info": quality_info
            })

        # Jika bukan bunga (confidence rendah)
        if not is_flower:
            return jsonify({
                "success": True,
                "is_flower": False,
                "mode": "upload",
                "predicted_name": flower_name,
                "confidence": float(confidence),
                "confidence_percent": f"{confidence:.2%}",
                "image_data": f"data:image/jpeg;base64,{img_base64}",
                "warning": f"Gambar yang diupload kemungkinan BUKAN BUNGA. Sistem memerlukan confidence minimal 75% untuk memastikan gambar adalah bunga. Silakan upload gambar bunga yang jelas.",
                "quality_info": quality_info
            })

        metadata = get_flower_metadata(flower_name, confidence)

        return jsonify({
            "success": True,
            "is_flower": True,
            "mode": "upload",
            "predicted_name": flower_name,
            "confidence": float(confidence),
            "confidence_percent": f"{confidence:.2%}",
            "image_data": f"data:image/jpeg;base64,{img_base64}",
            "metadata": metadata,
            "quality_info": quality_info
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/capture', methods=['POST'])
def capture_image():
    try:
        data = request.get_json()
        image_data = data['image'].split(',')[1]
        img_bytes = base64.b64decode(image_data)

        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img_array = np.array(img)

        flower_name, confidence, _, _, is_flower, quality_info = predict_flower(
            model,
            cat_to_name,
            class_names,
            img_array=img_array,
            check_quality=True,
            is_camera=True  # Threshold 90% untuk kamera
        )

        # Jika kualitas gambar buruk (gelap, blur, dll)
        if not quality_info["is_valid"]:
            return jsonify({
                "success": True,
                "is_flower": False,
                "mode": "camera",
                "predicted_name": flower_name,
                "confidence": float(confidence),
                "confidence_percent": f"{confidence:.2%}",
                "image_data": data['image'],
                "warning": f"Kualitas gambar tidak memadai: {quality_info['reason']}. Pastikan pencahayaan cukup dan kamera fokus pada bunga.",
                "quality_info": quality_info
            })

        # Jika bukan bunga (confidence < 90% untuk kamera)
        if not is_flower:
            return jsonify({
                "success": True,
                "is_flower": False,
                "mode": "camera",
                "predicted_name": flower_name,
                "confidence": float(confidence),
                "confidence_percent": f"{confidence:.2%}",
                "image_data": data['image'],
                "warning": "Gambar yang ditangkap kemungkinan bukan bunga atau tidak terdeteksi dengan jelas. Untuk mode kamera, sistem memerlukan confidence minimal 75%. Silakan arahkan kamera ke bunga dengan pencahayaan yang baik dan fokus yang jelas.",
                "quality_info": quality_info
            })

        metadata = get_flower_metadata(flower_name, confidence)

        return jsonify({
            "success": True,
            "is_flower": True,
            "mode": "camera",
            "predicted_name": flower_name,
            "confidence": float(confidence),
            "confidence_percent": f"{confidence:.2%}",
            "image_data": data['image'],
            "metadata": metadata,
            "quality_info": quality_info
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/search', methods=['POST'])
def search_flower():
    data = request.get_json()
    query = data.get('query', '').lower()

    if not query:
        return jsonify({"success": False, "error": "Query kosong"})

    results = []

    for class_id, item in flower_metadata.items():
        if query in item["name"].lower():
            results.append({
                "id": class_id,
                "name": item["name"],
                "scientific_name": item["scientific_name"],
                "physical_characteristics": item["physical_characteristics"],
                "habitat": item["habitat"],
                "benefits_or_meaning": item["benefits_or_meaning"]
            })

    # Sort results by ID (numerically)
    results.sort(key=lambda x: int(x['id']))

    return jsonify({
        "success": True,
        "count": len(results),
        "results": results
    })


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
