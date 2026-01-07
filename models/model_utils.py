# Perbaikan Final
# berisi fungsi pendukung (model, predict, dll)
# ============================================================

import tensorflow as tf
from keras import layers, models
from keras.applications import EfficientNetB0
import json
import numpy as np
import cv2
from PIL import Image
import os

# Cache compiled predict functions per model to speed inference
_PREDICT_FNS = {}


def _get_compiled_predict_fn(model_obj):
    """Return a cached tf.function for model inference (training=False)."""
    key = id(model_obj)
    fn = _PREDICT_FNS.get(key)
    if fn is None:

        @tf.function
        def _pred(x):
            return model_obj(x, training=False)

        _PREDICT_FNS[key] = _pred
        fn = _pred
    return fn

# ====== LOAD NAMA BUNGA ======
_MODELS_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    with open(os.path.join(_MODELS_DIR, 'cat_to_name.json'), 'r') as f:
        cat_to_name = json.load(f)
    print(f"✅ Loaded {len(cat_to_name)} flower names from cat_to_name.json")
except FileNotFoundError:
    print("❌ Error: File 'cat_to_name.json' tidak ditemukan.")
    # Inisialisasi dictionary dummy jika file tidak ditemukan
    cat_to_name = {str(i): f"Unknown Flower {i}" for i in range(102)}

# ====== MODEL ARCHITECTURE (Dipertahankan untuk referensi training) ======
def create_flower_model(num_classes=102):
    """Membuat arsitektur model berdasarkan EfficientNetB0."""
    base_model = EfficientNetB0(
        weights='imagenet',
        include_top=False,
        input_shape=(224, 224, 3),
    )
    base_model.trainable = False

    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.5),
        layers.Dense(512, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(256, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.2),
        layers.Dense(num_classes, activation='softmax')
    ])
    return model

# ====== FUNGSI VALIDASI KUALITAS GAMBAR ======
def check_image_quality(img_array, min_brightness=15, max_brightness=250, blur_threshold=15):
    """
    Memeriksa kualitas gambar sebelum prediksi.
    
    Args:
        img_array: Array gambar (RGB)
        min_brightness: Threshold minimum brightness (0-255)
        max_brightness: Threshold maximum brightness (0-255)
        blur_threshold: Threshold untuk deteksi blur (semakin rendah = semakin blur)
                       Default 15 untuk kamera real-time (lebih toleran untuk HP/webcam)
    
    Returns:
        is_valid: Boolean apakah gambar valid
        reason: Alasan jika gambar tidak valid
        brightness: Nilai brightness gambar
        blur_score: Nilai blur score
    """

    # Konversi ke grayscale untuk analisis
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array

    # Downscale besar untuk hemat CPU tanpa mengubah logika
    h, w = gray.shape[:2]
    if max(h, w) > 800:
        scale = 800.0 / max(h, w)
        gray_small = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        gray_small = gray

    # 1. Cek brightness (kecerahan)
    brightness = float(np.mean(gray_small))

    if brightness < min_brightness:
        return False, "Gambar terlalu gelap", brightness, 0.0

    if brightness > max_brightness:
        return False, "Gambar terlalu terang/overexposed", brightness, 0.0

    # 2. Cek blur menggunakan Laplacian variance (pada citra downscaled jika besar)
    blur_score = float(cv2.Laplacian(gray_small, cv2.CV_64F).var())

    if blur_score < blur_threshold:
        return False, "Gambar terlalu blur/tidak fokus", brightness, blur_score

    return True, "OK", brightness, blur_score

# ====== FUNGSI PREDIKSI YANG EFISIEN ======
def predict_flower(
    model_obj,
    cat_to_name,
    class_names,
    img_path=None,
    img_array=None,
    confidence_threshold=0.75,
    check_quality=False,
    is_camera=False,
):
    """
    Fungsi untuk memprediksi gambar bunga. 
    Menerima **objek model** yang sudah dimuat (model_obj).
    
    Args:
        confidence_threshold: Threshold minimum untuk menganggap gambar berisi bunga (default: 0.75)
        check_quality: Apakah perlu cek kualitas gambar (brightness, blur)
        is_camera: True jika dari kamera real-time (threshold lebih ketat)
    
    Returns:
        flower_name: Nama bunga hasil prediksi
        confidence: Nilai confidence
        preds: Array prediksi lengkap
        top_idx: Index kelas dengan confidence tertinggi
        is_flower: Boolean yang menunjukkan apakah gambar berisi bunga (True) atau tidak (False)
        quality_info: Dictionary berisi info kualitas gambar (jika check_quality=True)
    """

    quality_info = {"is_valid": True, "reason": "OK", "brightness": None, "blur_score": None}

    # === Persiapan gambar ===
    if img_path:
        img = Image.open(img_path).convert('RGB')
        img = img.resize((224, 224))
        img_array_processed = np.array(img)
        img_array_original = np.array(Image.open(img_path).convert('RGB'))
    elif img_array is not None:
        # Simpan gambar original untuk quality check
        img_array_original = img_array.copy()
        # Resize untuk prediksi
        img_array_processed = cv2.resize(img_array, (224, 224))
    else:
        raise ValueError("Harus ada img_path atau img_array untuk prediksi.")

    # === Validasi Kualitas Gambar ===
    if check_quality:
        is_valid, reason, brightness, blur_score = check_image_quality(img_array_original)
        quality_info = {
            "is_valid": is_valid,
            "reason": reason,
            "brightness": float(brightness),
            "blur_score": float(blur_score)
        }

        # Jika kualitas gambar buruk, langsung return dengan confidence 0
        if not is_valid:
            return "Unknown", 0.0, np.zeros(102), 0, False, quality_info

    # Normalisasi dan tambahkan dimensi batch
    img_array_processed = img_array_processed.astype('float32') / 255.0
    img_array_processed = np.expand_dims(img_array_processed, axis=0)

    # === Prediksi ===
    # Gunakan tf.function terkompilasi untuk mempercepat inference.
    x = tf.convert_to_tensor(img_array_processed, dtype=tf.float32)
    preds_tensor = _get_compiled_predict_fn(model_obj)(x)
    preds = preds_tensor.numpy()
    top_idx = int(np.argmax(preds[0]))
    confidence = float(preds[0][top_idx])

    # === Threshold dinamis: lebih ketat untuk upload file ===
    if is_camera:
        # Untuk kamera real-time, gunakan threshold 90% untuk mengurangi false positive pada objek non-bunga
        effective_threshold = max(confidence_threshold, 0.75)
    else:
        # Untuk upload file, gunakan threshold yang lebih ketat 
        effective_threshold = max(confidence_threshold, 0.75)

    # === Deteksi apakah gambar berisi bunga ===
    is_flower = confidence >= effective_threshold

    # === Mapping nama bunga ===
    class_num_str = class_names.get(top_idx, str(top_idx))
    flower_name = cat_to_name.get(class_num_str, f"Kelas tidak dikenal: {class_num_str}")

    return flower_name, confidence, preds[0], top_idx, is_flower, quality_info