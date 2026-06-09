from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, unset_jwt_cookies
from models import db, User, SystemLog

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'user')  # Optional role, default to user
    
    if not username or not email or not password:
        return jsonify({'message': 'Username, email, and password are required'}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 409
        
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 409
        
    try:
        new_user = User(username=username, email=email, role=role)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        # Log registration
        log = SystemLog(event_type='INFO', description=f"New user registered: {username}")
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'message': 'User registered successfully', 'user': new_user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400
        
    user = User.query.filter((User.username == username) | (User.email == username)).first()
    
    if not user or not user.check_password(password):
        # Log failed login attempt
        log = SystemLog(event_type='WARNING', description=f"Failed login attempt for username: {username}")
        db.session.add(log)
        db.session.commit()
        return jsonify({'message': 'Invalid credentials'}), 401
        
    # Create JWT token
    access_token = create_access_token(identity=str(user.id))
    
    # Log successful login
    log = SystemLog(event_type='LOGIN', description=f"User logged in: {user.username}")
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'message': 'Login successful',
        'token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    return jsonify({'user': user.to_dict()}), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    resp = jsonify({'message': 'Logout successful'})
    unset_jwt_cookies(resp)
    return resp, 200
