# Import packages
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize SQLAlchemy object
db = SQLAlchemy()

class Admin(db.Model):
    id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    classroom_codes = db.Column(db.JSON, default=[])
    custom_curriculums = db.Column(db.JSON, default=[])
    role = db.Column(db.String(50), default='teacher', nullable=False)
    user = db.relationship('User', backref='admin')

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.LargeBinary, nullable=False)
    email = db.Column(db.String(254), unique=True, nullable=True, index=True)
    completed_curriculums = db.Column(db.JSON, default=[])
    content_scores = db.Column(db.JSON, default=[])
    correct_answers = db.Column(db.JSON, default=[])
    current_curriculum = db.Column(db.String(120))
    current_question = db.Column(db.String(120))
    curriculum_scores = db.Column(db.JSON, default={})
    incorrect_answers = db.Column(db.JSON, default=[])
    xp = db.Column(db.JSON, default={})
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f'<User: {self.username}>'

class Classroom(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(120), unique=True, nullable=False, index=True)
    assigned_content = db.Column(db.JSON, default=[], nullable=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    admin = db.relationship('Admin', backref='classrooms')

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
    content_id = db.Column(db.String(50))
    curriculum_id = db.Column(db.String(50))
    possible_xp = db.Column(db.Float)
    difficulty = db.Column(db.Float)
    standard = db.Column(db.Integer)
    objective = db.Column(db.Integer)
    tags = db.Column(db.JSON)
    elapsed_time = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref='xp_entries')

class Content(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.String(120), unique=True, index=True, nullable=False)
    base_curriculums = db.Column(db.JSON, default=[])
    creator_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=True)

class Curriculum(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    curriculum_id = db.Column(db.String(120), unique=True, index=True, nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=True)

# === JOIN TABLES ===

# Content ↔ Curriculum
class ContentCurriculum(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, db.ForeignKey('content.id'), nullable=False)
    curriculum_id = db.Column(db.Integer, db.ForeignKey('curriculum.id'), unique=True, nullable=False)
    
    content = db.relationship('Content', backref='content_curriculums')
    curriculum = db.relationship('Curriculum', backref='curriculum_contents')

# User ↔ Content
class UserContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content_id = db.Column(db.Integer, db.ForeignKey('content.id'), nullable=False)

    user = db.relationship('User', backref='user_contents')
    content = db.relationship('Content', backref='content_users')

# User ↔ Curriculum
class UserCurriculum(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    curriculum_id = db.Column(db.Integer, db.ForeignKey('curriculum.id'), nullable=False)

    user = db.relationship('User', backref='user_curriculums')
    curriculum = db.relationship('Curriculum', backref='curriculum_users')

# Classroom ↔ Content
class ClassroomContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    content_id = db.Column(db.Integer, db.ForeignKey('content.id'), nullable=False)

    classroom = db.relationship('Classroom', backref='classroom_contents')
    content = db.relationship('Content', backref='content_classrooms')

# Classroom ↔ Curriculum
class ClassroomCurriculum(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    curriculum_id = db.Column(db.Integer, db.ForeignKey('curriculum.id'), nullable=False)

    classroom = db.relationship('Classroom', backref='classroom_curriculums')
    curriculum = db.relationship('Curriculum', backref='curriculum_classrooms')

# Curriculum ↔ Questions
class CurriculumQuestion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    curriculum_id = db.Column(db.Integer, db.ForeignKey('curriculum.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), unique=True, nullable=False)

    curriculum = db.relationship('Curriculum', backref='curriculum_questions')
    question = db.relationship('Questions', backref='question_curriculums')

# Curriculum ↔ Projects
class CurriculumProject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    curriculum_id = db.Column(db.Integer, db.ForeignKey('curriculum.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)

    curriculum = db.relationship('Curriculum', backref='curriculum_projects')
    project = db.relationship('Projects', backref='project_curriculums')

# === TASK TABLES ===

class Questions(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_key = db.Column(db.String(120), unique=True, nullable=False, index=True)
    content_id = db.Column(db.Integer, nullable=True, default=0)
    standard = db.Column(db.Integer, nullable=True, default=0)
    objective = db.Column(db.Integer, nullable=True, default=0)
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
    creator_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=True)

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
    creator_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=True)

    def __repr__(self):
        return f'Project: {self.task_key}'

if __name__ == "__main__":
    print("models.py")
