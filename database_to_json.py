# Import packages
from modules.data_helpers import CRUDHelper
from modules.models import Questions, db
import json
from sqlalchemy.exc import SQLAlchemyError
from app import app, db

# Set globals
output_file = "data/content_out.json"

def export_questions_to_json(outut_file):

    # Create the app context
    with app.app_context():
        
        # Query the Questions table
        questions = Questions.query.all()
        
        # Build the JSON data structure
        data = {"questions": {}}
        for q in questions:
            data["questions"][q.task_key] = {
                "code": q.code,
                "question": q.question,
                "answer": q.answer,
                "distractor1": q.distractor_1,
                "distractor2": q.distractor_2,
                "distractor3": q.distractor_3,
                "description": q.description,
                "video": q.video,
                "video_start": q.video_start,
                "video_end": q.video_end,
                "difficulty": q.difficulty,
                "creator_id": q.creator_id,
                "content_id": q.content_id,
                "standard": q.standard,
                "objective": q.objective,
                "tags": q.tags
            }
            
        with open(output_file, "w") as f:
            json.dump(data, f, indent=4)
        print(f"Exported {len(questions)} questions to {output_file}")
    
if __name__ == "__main__":
    export_questions_to_json(output_file)