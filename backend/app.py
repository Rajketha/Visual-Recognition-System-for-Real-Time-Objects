from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
import sys

# Ensure backend directory is in path for imports
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from config import Config
from models import db, User, SystemLog
from routes.auth import auth_bp
from routes.detect import detect_bp
from routes.analytics import analytics_bp
from routes.admin import admin_bp

def create_app():
    app = Flask(__name__, static_folder='static')
    app.config.from_object(Config)
    
    # Enable CORS for frontend interactions
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Initialize plugins
    db.init_app(app)
    jwt = JWTManager(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(detect_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')
    
    # Custom error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'message': 'Resource not found'}), 404
        
    @app.errorhandler(500)
    def server_error(error):
        return jsonify({'message': 'Internal server error'}), 500
        
    @app.route('/static/uploads/<path:filename>')
    def serve_uploads(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Initialize Database & Seed Default Admin
    with app.app_context():
        db.create_all()
        
        # Check if admin user exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            try:
                default_admin = User(
                    username='admin',
                    email='admin@visualsystem.com',
                    role='admin'
                )
                default_admin.set_password('admin123')
                db.session.add(default_admin)
                
                # Add default system log
                log = SystemLog(
                    event_type='INFO', 
                    description='Database initialized. Default admin seeded.'
                )
                db.session.add(log)
                db.session.commit()
                print("[Database] Default admin account seeded: username='admin', password='admin123'")
            except Exception as e:
                db.session.rollback()
                print(f"[Database] Error seeding admin account: {e}")
                
    return app

app = create_app()

if __name__ == '__main__':
    # Start backend server
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
