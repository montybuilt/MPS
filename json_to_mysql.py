import json
import pymysql
from pymysql.constants import CLIENT

# Database connection details
DB_HOST = 'andrewmontanus.mysql.pythonanywhere-services.com'
DB_USER = 'andrewmontanus'
DB_PASS = 'Cobia1966MPS2025'
DB_NAME = 'andrewmontanus$mps'

# Path to your JSON data file
DATA_FILE = '/home/andrewmontanus/MPS/data/content_in.json'

# Establish MySQL connection
connection = pymysql.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASS,
    database=DB_NAME,
    client_flag=CLIENT.MULTI_STATEMENTS
)

def insert_questions(data):
    with connection.cursor() as cursor:
        for task_key, question_data in data['questions'].items():
            try:
                cursor.execute(
                    """
                    INSERT INTO questions 
                    (task_key, code, question, answer, distractor_1, distractor_2, distractor_3, description, 
                    video, video_start, video_end, difficulty, tags, creator_id, content_id, standard, objective) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        task_key,
                        question_data.get('code'),
                        question_data.get('question'),
                        question_data.get('answer'),
                        question_data.get('distractor_1'),
                        question_data.get('distractor_2'),
                        question_data.get('distractor_3'),
                        question_data.get('description'),
                        question_data.get('video'),
                        question_data.get('video_start'),
                        question_data.get('video_end'),
                        question_data.get('difficulty'),
                        question_data.get('tags'),
                        question_data.get('creator_id'),
                        question_data.get('content_id'),
                        question_data.get('standard'),
                        question_data.get('objective')
                    )
                )
            except Exception as e:
                print(f"❌ Error inserting question {task_key}: {e}")
    connection.commit()

# Load the JSON data
try:
    with open(DATA_FILE, 'r') as file:
        data = json.load(file)
        insert_questions(data)
        print("✅ Questions data imported successfully.")
except FileNotFoundError:
    print(f"❌ JSON file not found: {DATA_FILE}")
except json.JSONDecodeError as e:
    print(f"❌ JSON decoding error: {e}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")
finally:
    connection.close()
