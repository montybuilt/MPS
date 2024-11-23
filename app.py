# Import packages
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, Response
from modules.helpers import Question, Curriculum, verify, login_required
import subprocess
import logging
import secrets
import os
import json

# Create the flask object
app = Flask(__name__)

# Set the debug mode
app.config['DEBUG'] = False  # Disable debug mode

# Set the secret key
app.secret_key = secrets.token_hex(16)

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s: %(message)s')

# Path to content.json located in the data directory
content_file_path = os.path.join('data', 'content.json')

@app.route('/')
def index():
    
    # List of admin users
    admin_users = ['amontanus']
    
    # Get the username
    username = session.get('username')
    
    # Check to see if user is an admin
    is_admin = username in admin_users
    
    return render_template('index.html', username = username, is_admin = is_admin)

@app.route('/login', methods=['POST'])
def login():
    
    # get the username and password form the form post
    username = request.form['username']
    password = request.form['password']
    is_electron = request.form.get('isElectron', 'false') == 'true'
    app.logger.debug(f"Electron Environment? {is_electron}")
    
    # Call the verify function to check credentials
    if verify(username, password):
        # Store the username and admin status in the session
        session['username'] = username
        session['is_admin'] = username in ['amontanus']
        
        # Redirect to the index page
        return redirect(url_for('index'))
    
    else:
        # Handle invalid login
        return render_template('index.html', error="Invalid username or password")

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect(url_for('index'))  # Redirect back to the home page


@app.route('/testprep')
@login_required
def testprep():
    
    username = session.get('username')
    return render_template("testprep.html", username=username)
    
@app.route('/test_request', methods=['POST'])
def test_request():
    '''This function gets the question content being requested by the client'''
    
    #Extract the key input from the request
    data = request.get_json()
    question_id = data.get('key-input').lower()
    
    # Log the value and type of question_id
    app.logger.debug(f"Question ID: {question_id}, Type: {type(question_id)}")
    
    # create a question object that retrieves the question data as an attribute
    question_data = Question(question_id)
    question_data = question_data.data
    
    # Log the problematic description
    app.logger.debug(f"Description to send: {question_data['Description']}")
    
    # Respond to the request by returning the data as a json
    response = jsonify(question_data)
    response.headers['Content-Type'] = 'application/json; charset=UTF-8'
    return response

@app.route('/get_curriculum', methods=['POST'])
def get_curriculum():
    '''This function gets the curriculum content based on the user's key-input'''
    
    app.logger.debug(request.is_json)
    #Extract the key input from the request
    data = request.get_json()
    curriculum_id = data.get('key-input').lower()
    
    # Log the value and type of question_id
    app.logger.debug(f"Curriculum ID: {curriculum_id}, Type: {type(curriculum_id)}")
    
    # create a question object that retrieves the question data as an attribute
    curriculum_data = Curriculum(curriculum_id).data
    
    # Respond to the request by returning the data as a json
    return jsonify(curriculum_data)

@app.route('/run_code', methods=['POST'])
def run_code():
    
    data = request.get_json()
    code = data.get('code', '')
    app.logger.debug(f"The raw code: {code}")

    try:
        # Use subprocess to run the code
        result = subprocess.run(['python', '-c', code], capture_output=True, text=True)
        app.logger.debug(f"Code output: {result}")

        output = result.stdout if result.returncode == 0 else result.stderr
    except Exception as e:
        output = str(e)
        
    return jsonify({'output': output})

# Route to the admin content creation page "content"
@app.route('/content', methods=['GET'])
def content_page():
    # Check if the user is an admin
    if not session.get('username') or not session.get('is_admin'):
        return redirect(url_for('index'))  # Redirect non-admin users

    return render_template('content.html')  # Render the content creation page        

@app.route('/content_keys', methods=['GET'])
def content_keys():
    try:
        with open(content_file_path, 'r') as file:
            content = json.load(file)
        return jsonify({"keys": list(content.get('questions', {}).keys())})
    except Exception as e:
        app.logger.error(f"Error loading keys: {e}")
        return jsonify({"error": "Failed to load keys"}), 500


# Content creation route (only for admins)
@app.route('/submit_question', methods=['POST'])
def submit_question():
    # Check if the user is an admin
    app.logger.debug(f"Is admin?: {session.get('is_admin')}")
    if not session.get('username') or not session.get('is_admin'):
        app.logger.debug("No Admin Privelege!")
        return jsonify({"error": "Unauthorized"}), 401  # JSON response instead of HTML redirect

    # Handle POST request
    question_data = request.get_json()
    app.logger.debug(question_data)

    # The questionKey (ID) from the data
    question_key = question_data['key']

    # Read the existing content from content.json
    try:
        with open(content_file_path, 'r') as file:
            content = json.load(file)
        if 'questions' not in content:
            content['questions'] = {}  # Initialize 'questions' if not present
    except (FileNotFoundError, json.JSONDecodeError):
        content = {'questions': {}}  # Initialize with empty questions dictionary

    # Insert the new question under the correct key in the 'questions' dictionary
    content['questions'][question_key] = {
        'Tags': question_data['tags'],
        'Code': question_data['code'],
        'Question': question_data['stem'],
        'Answer': question_data['answer'],
        'Distractor1': question_data['distractors'][0],
        'Distractor2': question_data['distractors'][1],
        'Distractor3': question_data['distractors'][2],
        'Description': question_data['description'],
        'Video': question_data['videoURL'],
        'Difficulty': question_data['difficulty']
    }
    
    app.logger.debug(content)

    # Write the updated content back to content.json
    with open(content_file_path, 'w') as file:
        json.dump(content, file, indent=4)

    return jsonify({"message": "Question submitted successfully"}), 200  # JSON success response

@app.route('/content_data', methods=['POST'])
def content_data():
    '''This function gets a question for the content page'''
    
    #Extract the question key from the request
    data = request.get_json()
    question_id = data.get('questionKey').lower()
    
    # Create a question object that retrieves the question data as an attribute
    question_data = Question(question_id)
    question_data = question_data.data
    
    # Respond to the request by returning the data as a json
    response = jsonify(question_data)
    response.headers['Content-Type'] = 'application/json; charset=UTF-8'
    return response
   





#------------------------------------------------------------------------------------------#

if __name__ == '__main__':
    app.run(debug=False)
