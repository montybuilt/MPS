from flask_sqlalchemy import SQLAlchemy 
from datetime import datetime

# Initialize SQLAlchemy object here to avoid circular imports
db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    assigned_curriculums = db.Column(db.JSON)
    completed_curriculums = db.Column(db.JSON)
    content_scores = db.Column(db.JSON)
    correct_answers = db.Column(db.JSON)
    current_curriculum = db.Column(db.String(120))
    current_question = db.Column(db.String(120))
    curriculum_scores = db.Column(db.JSON)
    incorrect_answers = db.Column(db.JSON)
    questions_list = db.Column(db.JSON)
    xp = db.Column(db.JSON)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)  # For soft delete

    def __repr__(self):
        return f'<User {self.username}>'

class XP(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dXP = db.Column(db.Float)
    question_id = db.Column(db.String(120))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Optional if you plan to link XP to users

    def __repr__(self):
        return f'<XP {self.dXP} for {self.question_id}>'

