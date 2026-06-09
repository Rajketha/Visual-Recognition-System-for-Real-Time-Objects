from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import base64
import os
import uuid
import cv2
import numpy as np
from datetime import datetime
from models import db, Detection, SystemLog
from ai_engine import ai_engine

detect_bp = Blueprint('detect', __name__)

@detect_bp.route('/detect', methods=['POST'])
@jwt_required(optional=True)
def run_detection():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    frame_data = data.get('frame')
    if not frame_data:
        return jsonify({'message': 'No frame data provided'}), 400
        
    try:
        # Decode base64 frame
        if ',' in frame_data:
            header, frame_data = frame_data.split(',', 1)
            
        decoded_data = base64.b64decode(frame_data)
        nparr = np.frombuffer(decoded_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'message': 'Failed to decode image'}), 400
            
        # Run AI detection
        annotated_img, detections_list = ai_engine.detect(img)
        
        # Save image if detections are present
        saved_img_path = None
        if len(detections_list) > 0:
            filename = f"det_{uuid.uuid4().hex}.jpg"
            save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            cv2.imwrite(save_path, annotated_img)
            saved_img_path = f"/static/uploads/{filename}"
            
            # Store detections in database
            for d in detections_list:
                detection_record = Detection(
                    user_id=int(user_id) if user_id else None,
                    image_path=saved_img_path,
                    object_class=d['class'],
                    confidence=d['confidence']
                )
                db.session.add(detection_record)
                
            db.session.commit()
            
        # Encode annotated image back to base64
        _, buffer = cv2.imencode('.jpg', annotated_img)
        annotated_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'detections': detections_list,
            'annotated_frame': f"data:image/jpeg;base64,{annotated_base64}",
            'image_path': saved_img_path
        }), 200
        
    except Exception as e:
        db.session.rollback()
        # Log system error
        log = SystemLog(event_type='ERROR', description=f"Detection failed: {str(e)}")
        db.session.add(log)
        db.session.commit()
        return jsonify({'message': f'Detection error: {str(e)}'}), 500

@detect_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()
    try:
        # Fetch detections for logged in user
        history = Detection.query.filter_by(user_id=int(user_id)).order_by(Detection.timestamp.desc()).all()
        return jsonify([h.to_dict() for h in history]), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching history: {str(e)}'}), 500

@detect_bp.route('/history/clear', methods=['DELETE'])
@jwt_required()
def clear_history():
    user_id = get_jwt_identity()
    try:
        Detection.query.filter_by(user_id=int(user_id)).delete()
        db.session.commit()
        
        # Log action
        log = SystemLog(event_type='INFO', description=f"User {user_id} cleared detection history.")
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'message': 'Detection history cleared successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error clearing history: {str(e)}'}), 500
