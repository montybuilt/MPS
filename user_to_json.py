# Import packages
from modules.data_helpers import CRUDHelper
from modules.models import User, db
import json
from sqlalchemy.exc import SQLAlchemyError
from app import app, db

# Set globals
output_file = "data/user.json"

def export_to_json(output_file):

    # Create the app context
    with app.app_context():
        
        # Query the Questions table
        users = User.query.all()
        
        # Build the JSON data structure
        data = {"users": {}}
        for u in users:
            data["users"][u.username] = {
                "password_hash": u.password_hash,
                "email": u.email,
                "xp": u.xp,
                "updated_at": u.updated_at,
                "deleted_at": u.deleted_at,
                "completed_curriculums": u.completed_curriculums,
                "content_scores": u.content_scores,
                "correct_answers": u.correct_answers,
                "current_curriculum": u.current_curriculum,
                "current_question": u.current_question,
                "curriculum_scores": u.curriculum_scores,
                "incorrect_answers": u.incorrect_answers
            }
            
        with open(output_file, "w") as f:
            json.dump(data, f, indent=4)
        print(f"Exported {len(users)} questions to {output_file}")
    
if __name__ == "__main__":
    export_to_json(output_file)