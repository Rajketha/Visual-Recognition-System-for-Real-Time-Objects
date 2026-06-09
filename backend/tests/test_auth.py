import unittest
import json
import sys
import os

# Put backend folder in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models import db, User

class TestAuthAPI(unittest.TestCase):
    def setUp(self):
        # Configure app for testing with in-memory SQLite DB
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_user_registration(self):
        # Register user
        payload = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'password123'
        }
        res = self.client.post('/api/register', 
                               data=json.dumps(payload),
                               content_type='application/json')
        self.assertEqual(res.status_code, 201)
        
        data = json.loads(res.data.decode('utf-8'))
        self.assertEqual(data['user']['username'], 'testuser')

    def test_user_login(self):
        # Setup pre-existing user
        with self.app.app_context():
            user = User(username='loginuser', email='login@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()

        # Attempt Login
        payload = {
            'username': 'loginuser',
            'password': 'password123'
        }
        res = self.client.post('/api/login',
                               data=json.dumps(payload),
                               content_type='application/json')
        self.assertEqual(res.status_code, 200)
        
        data = json.loads(res.data.decode('utf-8'))
        self.assertIn('token', data)

    def test_profile_requires_jwt(self):
        # Attempt to access profile without token
        res = self.client.get('/api/profile')
        self.assertEqual(res.status_code, 401)

if __name__ == '__main__':
    unittest.main()
