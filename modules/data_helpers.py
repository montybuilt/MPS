# Import packages
import bcrypt
from modules.models import db, User, XP
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime

class CRUDHelper:
    ''' Generalized Class for database operations '''
    def __init__(self, model):
        self.model = model

    def create(self, **kwargs):
        try:
            new_record = self.model(**kwargs)
            db.session.add(new_record)
            db.session.commit()
            return new_record
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    def read(self, **kwargs):
        try:
            records = self.model.query.filter_by(**kwargs).all()
            return records
        except SQLAlchemyError as e:
            raise e

    def update(self, id, **kwargs):
        try:
            record = self.model.query.get(id)
            for key, value in kwargs.items():
                setattr(record, key, value)
            db.session.commit()
            return record
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

    def delete(self, id):
        try:
            record = self.model.query.get(id)
            db.session.delete(record)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            raise e

def verify(username, password):
    """Verify username and password"""
    try:
        user_crud = CRUDHelper(User)
        user = user_crud.read(username=username)[0]

        if user is None:
            return "Username not found"  # Return a user-friendly message

        # Check if the password matches
        if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            return True  # Return True if the password matches

        return "Invalid password"  # Return a message for invalid password

    except Exception as e:
        return f"Error verifying user: {e}"  # General error message
    
def initialize_user_session_data(username):
    '''Sync the sessionStorage to the database at login'''
    
    # Query the data fields
    try:
        user_crud = CRUDHelper(User)
        user = user_crud.read(username=username)[0]
        
        session_data = {"assignedContent": user.assigned_content,
                        "assignedCurriculums": user.assigned_curriculums,
                        "completedCurriculums": user.completed_curriculums,
                        "contentScores": user.content_scores,
                        "correctAnswers": user.correct_answers,
                        "currentCurriculum": user.current_curriculum,
                        "currentQuestionId": user.current_question,
                        "curriculumScores": user.curriculum_scores,
                        "incorrectAnswers": user.incorrect_answers,
                        "xp": user.xp,
                        "updatedAt": user.updated_at
                        }
        
        return session_data

    except Exception as e:
        return f"Error retrieving data: {e}"  # General error message

def update_user_session_data(username, session_data):
    '''Function to update database with user session data'''
    
    try:
        user_crud = CRUDHelper(User)
        user = user_crud.read(username=username)[0]
    
        map = {"completedCurriculums": "completed_curriculums",
               "contentScores": "content_scores",
               "correctAnswers": "correct_answers",
               "currentCurriculum": "current_curriculum",
               "currentQuestionId": "current_question",
               "curriculumScores": "curriculum_scores",
               "incorrectAnswers": "incorrect_answers",
               "xp": "xp",
               "updatedAt": "updated_at"}
        
        for key, value in session_data.items():
            if key in map:
                if key == "updatedAt":
                    try:
                        value = datetime.strptime(value, "%Y-%m-%dT%H:%M:%S.%fZ")
                    except ValueError:
                        value = datetime.strptime(value, "%Y-%m-%dT%H:%M:%S")  # Fallback format
                setattr(user, map[key], value)
                
        # Commit the changes
        db.session.commit()
        
    except SQLAlchemyError as se:
        db.session.rollback()
        raise se
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Unexpected error: {e}")
        raise e
