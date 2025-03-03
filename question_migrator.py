# Import packages
from modules.data_helpers import CRUDHelper
from modules.models import Questions, db
import json
from sqlalchemy.exc import SQLAlchemyError
from app import app, db

# Set globals
input_file = "data/content.json"

# Open and read the contents file
with open(input_file, 'r') as file:
    content = json.load(file)['questions']
    
print(content['pcap.1.1.1'].keys())

data = {}
crud_helper = CRUDHelper(Questions)

for key in content.keys():
    task_key = key
    code = content[key]['Code']
    question = content[key]['Question']
    answer = content[key]['Answer']
    distractor_1 = content[key]['Distractor1']
    distractor_2 = content[key]['Distractor2']
    distractor_3 = content[key]['Distractor3']
    description = content[key]['Description']
    video = content[key]['Video']
    difficulty = content[key]['Difficulty']
    tags = content[key]['Tags']
    
    with app.app_context():
    
        try:
            crud_helper.create(
                task_key = task_key,
                standard = 0,
                objective = 0,
                creator_id = 9,
                content_id = 'pcep',
                code = code,
                question = question,
                answer = answer,
                distractor_1 = distractor_1,
                distractor_2 = distractor_2,
                distractor_3 = distractor_3,
                description = description,
                video = video,
                difficulty = difficulty,
                tags = tags
            )
            
        except SQLAlchemyError as e:
            print(f"Error: {e}")
            
        else:
            print("Question Migration Was Successful")
    
    
    