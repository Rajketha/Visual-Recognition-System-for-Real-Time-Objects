import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'visual-recognition-secret-key-129381')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-92837198')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'visual_recognition.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload and static file locations
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    
    # Ensure folders exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, 'instance'), exist_ok=True)
