from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, SystemLog, Detection
import platform
import psutil
from ai_engine import ai_engine

admin_bp = Blueprint('admin', __name__)

def check_admin(user_id):
    user = User.query.get(user_id)
    return user and user.role == 'admin'

@admin_bp.route('/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    user_id = get_jwt_identity()
    if not check_admin(user_id):
        return jsonify({'message': 'Admin privileges required'}), 403
        
    try:
        users = User.query.all()
        return jsonify([u.to_dict() for u in users]), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching users: {str(e)}'}), 500

@admin_bp.route('/admin/users/<int:target_id>', methods=['DELETE'])
@jwt_required()
def delete_user(target_id):
    user_id = get_jwt_identity()
    if not check_admin(user_id):
        return jsonify({'message': 'Admin privileges required'}), 403
        
    if int(user_id) == target_id:
        return jsonify({'message': 'Cannot delete own account'}), 400
        
    try:
        user = User.query.get(target_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        db.session.delete(user)
        db.session.commit()
        
        # Log event
        log = SystemLog(event_type='INFO', description=f"Admin {user_id} deleted user account {target_id}")
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error deleting user: {str(e)}'}), 500

@admin_bp.route('/admin/logs', methods=['GET'])
@jwt_required()
def get_logs():
    user_id = get_jwt_identity()
    if not check_admin(user_id):
        return jsonify({'message': 'Admin privileges required'}), 403
        
    try:
        logs = SystemLog.query.order_by(SystemLog.timestamp.desc()).limit(100).all()
        return jsonify([l.to_dict() for l in logs]), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching logs: {str(e)}'}), 500

@admin_bp.route('/admin/system', methods=['GET'])
@jwt_required()
def get_system_status():
    user_id = get_jwt_identity()
    if not check_admin(user_id):
        return jsonify({'message': 'Admin privileges required'}), 403
        
    try:
        # System statistics
        cpu_usage = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        status = {
            'os': platform.system(),
            'cpu_usage': f"{cpu_usage}%",
            'ram_usage': f"{memory.percent}%",
            'ai_mode': 'Simulation Model' if ai_engine.is_simulation else 'Real YOLOv8 Inference',
            'has_gpu': not ai_engine.is_simulation and hasattr(ai_engine.model, 'device') and 'cuda' in str(ai_engine.model.device),
            'total_detections': Detection.query.count(),
            'total_users': User.query.count()
        }
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching system status: {str(e)}'}), 500
