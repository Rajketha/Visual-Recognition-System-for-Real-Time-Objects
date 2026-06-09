from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import bcrypt

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='user')  # 'user' or 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    detections = db.relationship('Detection', backref='user', lazy=True, cascade="all, delete-orphan")
    
    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }

class Detection(db.Model):
    __tablename__ = 'detections'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    image_path = db.Column(db.String(255), nullable=True)
    object_class = db.Column(db.String(80), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'image_path': self.image_path,
            'object_class': self.object_class,
            'confidence': round(self.confidence * 100, 1) if self.confidence <= 1.0 else self.confidence,
            'timestamp': self.timestamp.isoformat()
        }

class SystemLog(db.Model):
    __tablename__ = 'system_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(50), nullable=False)  # 'INFO', 'WARNING', 'ERROR', 'LOGIN', 'DETECTION'
    description = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'event_type': self.event_type,
            'description': self.description,
            'timestamp': self.timestamp.isoformat()
        }
