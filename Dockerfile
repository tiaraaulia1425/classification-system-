# ===============================
# BASE IMAGE (STABIL UNTUK TF)
# ===============================
FROM python:3.11-slim

# ===============================
# ENV
# ===============================
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TF_CPP_MIN_LOG_LEVEL=2

# ===============================
# SYSTEM DEPENDENCIES (MINIMAL)
# ===============================
RUN apt-get update && apt-get install -y \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# ===============================
# WORKDIR
# ===============================
WORKDIR /app

# ===============================
# INSTALL PYTHON DEPENDENCIES
# ===============================
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ===============================
# COPY PROJECT
# ===============================
COPY . .

# ===============================
# EXPOSE PORT
# ===============================
EXPOSE 8080

# ===============================
# START APP
# ===============================
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "2", "--timeout", "120"]
