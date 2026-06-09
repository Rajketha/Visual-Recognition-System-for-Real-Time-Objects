from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import datetime, timedelta
from models import db, Detection

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    user_id = get_jwt_identity()
    try:
        # Total user detections
        total_detections = Detection.query.filter_by(user_id=int(user_id)).count()
        
        # Object frequency analysis
        frequency_query = db.session.query(
            Detection.object_class, 
            func.count(Detection.id).label('count')
        ).filter_by(user_id=int(user_id)).group_by(
            Detection.object_class
        ).order_by(func.count(Detection.id).desc()).limit(10).all()
        
        frequencies = [{'label': f[0].upper(), 'count': f[1]} for f in frequency_query]
        
        # Detections over the last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        timeline_query = db.session.query(
            func.date(Detection.timestamp).label('date'),
            func.count(Detection.id).label('count')
        ).filter(
            Detection.user_id == int(user_id),
            Detection.timestamp >= seven_days_ago
        ).group_by(
            func.date(Detection.timestamp)
        ).order_by(func.date(Detection.timestamp).asc()).all()
        
        timeline = [{'date': t[0], 'count': t[1]} for t in timeline_query]
        
        # Overall average confidence score
        avg_conf_query = db.session.query(
            func.avg(Detection.confidence)
        ).filter_by(user_id=int(user_id)).scalar()
        
        avg_confidence = round(float(avg_conf_query) * 100, 1) if avg_conf_query else 0.0

        return jsonify({
            'total_detections': total_detections,
            'avg_confidence': avg_confidence,
            'object_frequencies': frequencies,
            'timeline': timeline
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error aggregating analytics data: {str(e)}'}), 500
