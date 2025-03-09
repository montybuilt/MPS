import json
from sqlalchemy.exc import SQLAlchemyError
from modules.models import Questions, db
from app import app


def import_questions_from_json(input_file):
    with app.app_context():
        # Load the JSON file
        with open(input_file, "r") as f:
            data = json.load(f)
        
        # Get the dictionary of questions
        questions_data = data.get("questions", {})
        
        for task_key, q_data in questions_data.items():
            # Look for an existing question with the same task_key
            question = Questions.query.filter_by(task_key=task_key).first()
            
            if question:
                # Update the existing record
                question.code = q_data.get("code")
                question.question = q_data.get("question")
                question.answer = q_data.get("answer")
                question.distractor_1 = q_data.get("distractor1")
                question.distractor_2 = q_data.get("distractor2")
                question.distractor_3 = q_data.get("distractor3")
                question.description = q_data.get("description")
                question.video = q_data.get("video")
                question.video_start = q_data.get("video_start")
                question.video_end = q_data.get("video_end")
                question.difficulty = q_data.get("difficulty")
                question.creator_id = q_data.get("creator_id")
                question.content_id = q_data.get("content_id")
                question.standard = q_data.get("standard")
                question.objective = q_data.get("objective")
                question.tags = q_data.get("tags")
            else:
                # Create a new record if task_key does not exist
                new_question = Questions(
                    task_key=task_key,
                    code=q_data.get("code"),
                    question=q_data.get("question"),
                    answer=q_data.get("answer"),
                    distractor_1=q_data.get("distractor1"),
                    distractor_2=q_data.get("distractor2"),
                    distractor_3=q_data.get("distractor3"),
                    description=q_data.get("description"),
                    video=q_data.get("video"),
                    video_start=q_data.get("video_start"),
                    video_end=q_data.get("video_end"),
                    difficulty=q_data.get("difficulty"),
                    creator_id=q_data.get("creator_id"),
                    content_id=q_data.get("content_id"),
                    standard=q_data.get("standard"),
                    objective=q_data.get("objective"),
                    tags=q_data.get("tags")
                )
                db.session.add(new_question)
        
        try:
            db.session.commit()
            print(f"Imported/Updated {len(questions_data)} questions from {input_file}")
        except SQLAlchemyError as e:
            db.session.rollback()
            print("Error during database commit:", e)

if __name__ == "__main__":
    input_file = "data/content_in.json"
    import_questions_from_json(input_file)
