# Import packages
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from modules import Question, Curriculum, verify, login_required, hashit, fetch_usernames, fetch_user_data
from modules import db, initialize_user_session_data, update_user_session_data, create_new_user, update_user_data
from modules import delete_user
from flask_migrate import Migrate
import subprocess, logging, secrets, os, json

# Create the flask object
app = Flask(__name__)

# Set the debug mode
app.config['DEBUG'] = False  # Disable debug mode

# Set the secret key
app.secret_key = secrets.token_hex(16)

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s: %(message)s')

# Set the database configurations
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the app with db object
db.init_app(app)

# Initialize flask-migrate
migrate = Migrate(app, db)

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
    '''Verify login and initialize session data'''
    try:
        username = request.form['username']
        password = request.form['password']

        result = verify(username, password)

        if result is True:  # If the verification was successful
            session['username'] = username
            session['is_admin'] = username in ['amontanus']
            session_data = initialize_user_session_data(username)

            return jsonify({'message': 'Login successful', 'session_data': session_data}), 200

        # If result is not True, it will contain an error message to display
        return jsonify({'error': result}), 401
    
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred {e}'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect(url_for('index'))  # Redirect back to the home page

@app.route('/admin', methods=['GET'])
@login_required
def admin():
    '''Admin dashboard route'''

    # Get username
    username = session.get('username')

    if session.get('is_admin'):
        return render_template('admin.html', username=username, is_admin=True)
    else:
        return redirect(url_for('index'))

@app.route('/update_session', methods=['POST'])
def update_session():
    '''Route to update the database with sessionStorate'''
    # Extract the session data from the request
    session_data = request.get_json()
    
    # Get the username
    username = session.get('username')
    
    # Write the session data to the database
    try:
        update_user_session_data(username, session_data, app.logger)
    except Exception as e:
        app.logger.debug(f"Update Session Error: {e}")
        return jsonify({"message": "Session Update Error"}), 400
    
    return jsonify({"message": "Session data submitted successfully"}), 200

@app.route('/new_user', methods=['GET', 'POST'])
@login_required
def new_user():
    '''This route handles creation of new users'''
    
    if request.method == 'POST':
        # Extract request data
        username = request.form['username']
        password = hashit(request.form['password'])
        email = request.form['email']
        
        # Invoke the create_new_user function from data_helpers
        try:
            new_user = create_new_user(username, password, email)
            if session.get('is_admin'):
                return redirect(url_for('admin'))
            else:
                return redirect(url_for('index'))
        except Exception as e:
            app.logger.debug(f"Error creating user {username}: {e}")
            return redirect(url_for('new_user_error', username=new_user))
            
    return render_template('new_user.html')

@app.route('/new_user_error/<username>')
def user_created(username):
    return f"Something went wrong ... User {username} not created successfully"

@app.route('/remove_user', methods=['GET'])
@login_required
def remove_user():
    # Check to make sure user is admin
    if session.get('is_admin'):
        return render_template('remove_user.html')

@app.route('/remove_user_data', methods=['GET', 'POST'])
@login_required
def remove_user_data():
    '''This route handles deletion of an existing user'''
    
    if session.get('is_admin'):
    
        info = request.json
        username = info['username']
        admin_username = info['adminUsername']
        admin_password = info['adminPassword']
    
        try:
            assert verify(admin_username, admin_password) == True
            delete_user(username, app.logger)
            return jsonify({"message": f"User {username} was deleted."}), 200
        
        except AssertionError:
            return jsonify({"message": "Incorrect Admin Credientials."})
        
        except Exception as e:
            return jsonify({"message": f"Unexpected Error: {e}"})


@app.route('/user_data', methods=['GET'])
@login_required
def user_data():
    # Check to make sure user is admin
    if session.get('is_admin'):
        return render_template('user_data.html')

@app.route('/get_users', methods=['GET'])
@login_required
def get_users():
    try:
        users = fetch_usernames()
        sorted_users = sorted([user.username for user in users])
        return jsonify(sorted_users)
    except Exception as e:
        app.logger.debug(f"Error fetching usernames: {e}")
        return jsonify({'message': 'Error fetching usernames'}), 500

@app.route('/get_user_data', methods=['GET'])
@login_required
def get_user_data():
    '''Route to fetch user data'''
    
    # Check to make sure user is admin
    if session.get('is_admin'):
    
        username = request.args.get('username')
        try:
            user_data = fetch_user_data(username)
            if user_data:
                return jsonify(user_data)
            else:
                return jsonify({'message': 'User not found'}), 404
        except Exception as e:
            app.logger.debug(f"Error fetching user data for {username}: {e}")
            return jsonify({'message': 'Error fetching user data'}), 500

@app.route('/update_user', methods=['POST'])
@login_required
def update_user():
    '''Route to update user data'''
    
    # Check to make sure user is admin
    if session.get('is_admin'):
        
        changes = request.json
        
        username = changes.pop('username', None)  # Extract username from changes
        
        if not username:
            return jsonify({'message': 'Username is required'}), 400
    
        try:
            update_user_data(username, changes, app.logger)
            return jsonify({'message': 'User data updated successfully'}), 200
        except Exception as e:
            app.logger.debug(f"Error updating user data for {username}: {e}")
            return jsonify({'message': 'Error updating user data'}), 500


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
    
    # create a question object that retrieves the question data as an attribute
    question_data = Question(question_id)
    question_data = question_data.data
    
    # Respond to the request by returning the data as a json
    response = jsonify(question_data)
    response.headers['Content-Type'] = 'application/json; charset=UTF-8'
    return response

@app.route('/get_curriculum', methods=['POST'])
def get_curriculum():
    '''This function gets the curriculum content based on the user's key-input'''
    
    #Extract the key input from the request
    data = request.get_json()
    curriculum_id = data.get('key-input').lower()
    
    # create a question object that retrieves the question data as an attribute
    curriculum_data = Curriculum(curriculum_id).data
    
    # Respond to the request by returning the data as a json
    return jsonify(curriculum_data)

@app.route('/run_code', methods=['POST'])
def run_code():
    '''Function to execute code from the CodeMirror'''
    
    # Extract the code
    data = request.get_json()
    code = data.get('code', '')
    
    try:
        # Run the code with subprocess
        result = subprocess.run(['python', '-c', code], capture_output=True, text=True)
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
        return jsonify({"error": "Failed to load keys"}), 500

# Content creation route (only for admins)
@app.route('/submit_question', methods=['POST'])
def submit_question():
    ''' Saves new question in content.json'''
    ''' Future upgrade, write to database'''
    # Check if the user is an admin
    if not session.get('username') or not session.get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 401  # JSON response instead of HTML redirect

    # Extract question data from request
    question_data = request.get_json()

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