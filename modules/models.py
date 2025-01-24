# Import packages
from flask_sqlalchemy import SQLAlchemy 
from datetime import datetime

# Initialize SQLAlchemy object here to avoid circular imports
db = SQLAlchemy()

class Admin(db.Model):
    id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    classroom_codes = db.Column(db.JSON, default=[])
    custom_curriculums = db.Column(db.JSON, default=[])
    role = db.Column(db.String(50), default='teacher', nullable=False)  # 'teacher' or 'system_admin'
    user = db.relationship('User', backref='admin')

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.LargeBinary, nullable=False)
    email = db.Column(db.String(254), unique=True, nullable=True, index=True)
    classroom_codes = db.Column(db.String(120), index=True)
    assigned_curriculums = db.Column(db.JSON, default=[], index=True)
    assigned_content = db.Column(db.JSON, default=[], index=True)
    special_curriculums = db.Column(db.JSON, default=[], index=True)
    completed_curriculums = db.Column(db.JSON, default=[])
    content_scores = db.Column(db.JSON, default=[])
    correct_answers = db.Column(db.JSON, default=[])
    current_curriculum = db.Column(db.String(120))
    current_question = db.Column(db.String(120))
    curriculum_scores = db.Column(db.JSON, default={})
    incorrect_answers = db.Column(db.JSON, default=[])
    xp = db.Column(db.JSON, default={})
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)  # For soft delete

    def __repr__(self):
        return f'<User: {self.username}>'
    
class Classroom(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(120), unique=True, nullable=False, index=True)
    assigned_content = db.Column(db.JSON, default=[], nullable=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    admin = db.relationship('Admin', backref='classrooms')  # An admin manages many classrooms

class ClassroomUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    classroom = db.relationship('Classroom', backref='classroom_users')
    user = db.relationship('User', backref='classroom_users') 

class XP(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dXP = db.Column(db.Float)
    question_id = db.Column(db.String(120))
    curriculum_id = db.Column(db.String(50))
    elapsed_time = db.Column(db.Float, nullable=False)
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
    task_list = db.Column(db.JSON, default=[])
    
    def __repr__(self):
        return f'Curriculum ID: {self.curriculum_id};'
    
class Questions(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_key = db.Column(db.String(120), unique=True, nullable=False, index=True)
    code = db.Column(db.Text())
    question = db.Column(db.String(200))
    answer = db.Column(db.String(120))
    distractor_1 = db.Column(db.String(120))
    distractor_2 = db.Column(db.String(120))
    distractor_3 = db.Column(db.String(120))
    description = db.Column(db.Text())
    video = db.Column(db.String(500))
    video_start = db.Column(db.Integer)
    video_end = db.Column(db.Integer)
    difficulty = db.Column(db.Float)
    tags = db.Column(db.JSON, default=[])
    
    def __repr__(self):
        return f'Question: {self.task_key}'
    
class Projects(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_key = db.Column(db.String(120), unique=True, nullable=False, index=True)
    code = db.Column(db.Text())
    hint_1 = db.Column(db.Text())
    hint_2 = db.Column(db.Text())
    spec = db.Column(db.Text())
    test = db.Column(db.Text())
    description = db.Column(db.Text())
    video = db.Column(db.String(500))
    difficulty = db.Column(db.Float)
    tags = db.Column(db.JSON, default=[])
    
    def __repr__(self):
        return f'Question: {self.task_key}'

if __name__ == "__main__":
    print("models.py")