# Import packages
import subprocess, logging, secrets, os
from flask_migrate import Migrate
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from modules import *
from modules import db


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

            return jsonify({'message': 'Login successful', 'session_data': session_data, 'username': username}), 200

        # If result is not True, it will contain an error message to display
        return jsonify({'error': result}), 401
    
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred {e}'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect(url_for('index'))  # Redirect back to the home page

@app.route('/dashboard', methods=['GET'])
@login_required
def dashboard():
    username = session['username']
    return render_template('dashboard.html', username=username)

@app.route('/get_xp', methods=['POST'])
@login_required
def get_xp():
    # get the last fetched datetime from request
    last_fetched_datetime = request.json.get('lastFetchedDatetime')
    
    # get the username from session
    username = session['username']
    
    # query the database for data (if needed)
    xp_data = fetch_xp_data(username, last_fetched_datetime, app.logger)
    
    if xp_data:
    
        # organize the response dictionary
        response = {
                    'xpData': xp_data['xpData'],
                    'xpLastFetchedDatetime': xp_data['mostRecentDatetime'],
                    'xpUsername': username}
        
        # Return the XP data to the client (or None if no data)
        return jsonify(response)
    
    else:
        return jsonify({"message": "No new XP data", "username": username})

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
    username = session.get('username')
    
    if request.method == 'POST':
        # Extract request data
        new_username = request.form['username']
        password = hashit(request.form['password'])
        email = request.form['email']
                
        # Invoke the create_new_user function from data_helpers
        try:
            new_user = create_new_user(new_username, password, email)
            if session.get('is_admin'):
                return redirect(url_for('admin', username=username))
            else:
                return redirect(url_for('index'))
        except Exception as e:
            app.logger.debug(f"Error creating user {username}: {e}")
            return redirect(url_for('new_user_error', username=new_user))
            
    return render_template('new_user.html', username=username)

@app.route('/new_user_error/<username>')
def user_created(username):
    return f"Something went wrong ... User {username} not created successfully"

@app.route('/remove_user', methods=['GET'])
@login_required
def remove_user():
    username = session.get('username')
    # Check to make sure user is admin
    if session.get('is_admin'):
        return render_template('remove_user.html', username=username)

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
    # Get the username
    username = session.get('username')
    # Check to make sure user is admin
    if session.get('is_admin'):
        return render_template('user_data.html', username=username)

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
        app.logger.debug(f"Changes: {changes}")
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
    
@app.route('/task_request', methods=['POST'])
def task_request():
    '''This function gets the question content being requested by the client'''
    
    #Extract the key input from the request
    data = request.get_json()
    question_id = data.get('key-input').lower()
    
    # Determine if the task is a Question or a Project
    
    # Use the fetch_question function to retrieve the question data
    question_data = fetch_question(question_id, app.logger)
    
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

@app.route('/course_content', methods=['GET'])
def course_content():
    '''Route to draw the course_content page'''
    username = session.get('username')
    
    # Check if the user is an admin
    if not session.get('is_admin'):
        return redirect(url_for('index'))  # Redirect non-admin users

    return render_template('course_content.html', username=username)  # Render the content creation page
    
# Route to the admin content creation page "content"
@app.route('/content', methods=['GET'])
def content_page():
    
    username = session.get('username')
    
    # Check if the user is an admin
    if not session.get('is_admin'):
        return redirect(url_for('index'))  # Redirect non-admin users

    return render_template('content.html', username=username)  # Render the content creation page        

@app.route('/new_content_or_curriculum', methods=['GET', 'POST'])
def new_content():
    '''Route to add new content IDs'''
    
    # Check if the user is an admin
    if not session.get('is_admin'):
        return redirect(url_for('index'))  # Redirect non-admin users
    
    # Extract the new content_id
    new_content = request.get_json()
    content_id = new_content['data']
    table = new_content['table']
    
    try:
        add_new_content(content_id, table, app.logger)
        return jsonify({"message": "New content added"}), 201
    
    except IntegrityError as ie:
        return jsonify({"error": f"Content ID already exists: {ie}"}), 409
    
    except Exception as e:
        return jsonify({"error": f"Database Error: {e}"}), 500
    

@app.route('/content_keys', methods=['GET'])
def content_keys():
    try:
        task_keys = fetch_task_keys()
        return jsonify({"keys": task_keys}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to load keys: {e}"}), 500

@app.route('/submit_question', methods=['POST'])
@login_required
def submit_question():
    """Saves a new question or updates an existing question in the database."""
    try:
        # Authorization check
        if not session.get('is_admin'):
            app.logger.warning("Unauthorized access attempt to submit_question.")
            return jsonify({"error": "Unauthorized access."}), 401

        # Extract question data from request
        question_data = request.get_json()
        question_key = question_data.pop('key', None)

        if not question_key:
            app.logger.warning("Missing 'key' in question data.")
            return jsonify({"error": "Missing question key."}), 400

        # Determine if it's a new question or an update
        is_new = question_key not in fetch_task_keys()
        app.logger.debug(f"New question? {is_new}")

        if is_new:
            # Handle new question insertion
            question_data['task_key'] = question_key
            new_question(question_data, app.logger)
            return jsonify({"message": "New question added."}), 201

        # Handle question update
        update_message = update_question(question_key, question_data, app.logger)
        return jsonify({"message": update_message}), 200

    except Exception as e:
        app.logger.error(f"Error in /submit_question: {e}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@app.route('/content_data', methods=['POST'])
def content_data():
    '''This function gets a question for the testprep page'''
    
    #Extract the question key from the request
    data = request.get_json()
    question_id = data.get('questionKey').lower()
    
    # Create a question object that retrieves the question data as an attribute
    question_data = fetch_question(question_id, app.logger)
    
    # Respond to the request by returning the data as a json
    response = jsonify(question_data)
    response.headers['Content-Type'] = 'application/json; charset=UTF-8'
    return response

@app.route('/update_xp', methods=['POST'])
def update_xp():
    '''Route to get xp updates and post to the database'''
    
    try:
    
        # Extract the xp data from the request
        xp_data = request.get_json()
        
        # Update the xp_data to include username
        xp_data.update({'user_id': session.get('username')})
        app.logger.debug(f"In Route: {xp_data}")
        
        # Call call the data helper function to update the database
        update_xp_data(xp_data, app.logger)
        
        # Return a sucess response for testing
        return jsonify({"status": "success", "message": "XP Data Received"}), 200
    
    except Exception as e:
        return jsonify({"status": "error", "message":str(e)}), 500
    
@app.route('/course_data', methods=['GET'])
def course_data():
    try:
        course_content = fetch_course_data(app.logger)
        
        return jsonify(course_content), 200
    except Exception as e:
        app.logger.error(f"Error in /course_data: {e}")
        return jsonify({'message': 'Error fetching course data'}), 500

#------------------------------------------------------------------------------------------#

if __name__ == '__main__':
    app.run(debug=True)