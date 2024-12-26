from flask_sqlalchemy import SQLAlchemy 
from datetime import datetime

# Initialize SQLAlchemy object here to avoid circular imports
db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(254), unique=True, nullable=True, index=True)
    assigned_curriculums = db.Column(db.JSON, default=[], index=True)
    assigned_content = db.Column(db.JSON, default=[], index=True)
    completed_curriculums = db.Column(db.JSON, default=[])
    content_scores = db.Column(db.JSON, default={})
    correct_answers = db.Column(db.JSON, default={})
    current_curriculum = db.Column(db.String(120))
    current_question = db.Column(db.String(120))
    curriculum_scores = db.Column(db.JSON, default={})
    incorrect_answers = db.Column(db.JSON, default=[])
    xp = db.Column(db.JSON, default={})
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)  # For soft delete

    def __repr__(self):
        return f'<User: {self.username}>'

class XP(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dXP = db.Column(db.Float)
    question_id = db.Column(db.String(120))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Optional if you plan to link XP to users
    user = db.relationship('User', backref='xp_entries')

    def __repr__(self):
        return f'<XP: {self.dXP} for {self.question_id}>'
    
class Content(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.String(120), unique=True, index=True, nullable=False)
    base_curriculums = db.Column(db.JSON, default=[])
    
    def __repr__(self):
        return f'<Content: {self.content_id}>'
    
class Curriculum(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    curriculum_id = db.Column(db.String(120), unique=True, index=True, nullable=False)
    questions_list = db.Column(db.JSON, default=[])
    
    def __repr__(self):
        return f'Curriculum ID: {self.curriculum_id};'
    
class Questions(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question_key = db.Column(db.String(120), unique=True, nullable=False, index=True)
    code = db.Column(db.Text())
    question = db.Column(db.String(200))
    answer = db.Column(db.String(120))
    distractor_1 = db.Column(db.String(120))
    distractor_2 = db.Column(db.String(120))
    distractor_3 = db.Column(db.String(120))
    description = db.Column(db.Text())
    video = db.Column(db.String(500))
    difficulty = db.Column(db.Float)
    tags = db.Column(db.JSON, default=[])
    
    def __repr__(self):
        return f'Question: {self.question_key}'

