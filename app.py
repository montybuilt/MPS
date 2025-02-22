# Import packages
import subprocess, logging, secrets, os
from flask_migrate import Migrate
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from werkzeug.exceptions import HTTPException
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
    
    # Get the username
    username = session.get('username')
    
    # Check to see if user is an admin
    is_admin = session.get('is_admin')
    app.logger.debug(f"Is admin: {is_admin}")
    
    return render_template('index.html', username = username, is_admin = is_admin)

@app.route('/login', methods=['POST'])
def login():
    '''Verify login and initialize session data'''
    try:
        username = request.form['username']
        password = request.form['password']

        result = verify(username, password)

        if result is True:  # If the verification was successful
            
            # Build the session data for this app
            build_session(username, app.logger)
            app.logger.debug(f"The login was successful - building sessionStorage")
            # Build sesstionStorage data for the client
            sessionStorage_data = initialize_user_sessionStorage_data(app.logger)

            return jsonify({'message': 'Login successful', 'session_data': sessionStorage_data, 'username': username}), 200

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

@app.route('/get_dashboard', methods=['POST'])
@login_required
def get_dashboard():
    '''Route to handle request for all data on dashboard page'''
    
    # get the username and user_id
    username = session.get('username')
    user_id = session.get('user_id')
    
    # get the last fetched datetime from request
    last_fetched_datetime = request.json.get('lastFetchedDatetime')
    
    # Get the xp history update for the user
    xp_data = fetch_xp_data(username, last_fetched_datetime, app.logger)
    
    # Get the content and curriculum assignments for the user
    user_assignments = fetch_user_assignments(user_id, app.logger)
    
    response = {'userAssignments': user_assignments}
    
    if xp_data:
    
        # organize the response dictionary
        response.update({'xpData': xp_data['xpData'],
                         'xpLastFetchedDatetime': xp_data['mostRecentDatetime'],
                         'xpUsername': username
        })
        
        # Return the XP data to the client (or None if no data)
        return jsonify({"data": response, "message": "XP data found", "username": username})
    
    else:
        
        return jsonify({"data": response, "message": "No new XP Data", "username": username})
    
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
    '''Route to update the database with sessionStorage'''
    # Extract the session data from the request
    session_data = request.get_json()
    
    # Write the session data to the database
    
    try:
        
        update_user_session_data(session_data, app.logger)
        
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
    '''Responds with a list of usernames for user_data.html'''
    
    try:
        users = fetch_usernames()
        return jsonify({'users': users}), 200
    
    except HTTPException as e:
        return jsonify({'error': str(e)}), e.code
    
    except Exception as e:
        return jsonify({'error': 'Internal Server Error'}), 500

@app.route('/get_user_data', methods=['GET'])
@login_required
def get_user_data():
    '''Route to fetch user data'''
    
    # Check to make sure user is admin
    if session.get('is_admin'):
    
        username = request.args.get('username')
                
        try:
            user_data = fetch_user_data(username, app.logger)
            if user_data:
                return jsonify(user_data)
            else:
                return jsonify({'message': 'User not found'}), 404
        except Exception as e:
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
    question_id = data.get('key-input')  #formerly  .lower()
    
    # Determine if the task is a Question or a Project
    
    # Use the fetch_question function to retrieve the question data
    question_data = fetch_question(question_id, app.logger)
    
    # Respond to the request by returning the data as a json
    response = jsonify(question_data)
    response.headers['Content-Type'] = 'application/json; charset=UTF-8'
    return response

@app.route('/get_curriculum', methods=['POST'])
def get_curriculum():
    '''This function gets the questions list for the curriculum_id'''
    
    #Extract the key input from the request
    data = request.get_json()
    if data.get('key-input'):
        curriculum_id = data.get('key-input')  # formerly made .lower()
        app.logger.debug(f"Curriculum ID: {curriculum_id}")
    else:
        return jsonify({"error": "No curriculum ID given"}), 400
    
    try:
        curriculum_data = fetch_curriculum_task_list(curriculum_id)
        app.logger.debug(f"Task List: {curriculum_data}")
        return jsonify(curriculum_data)
        
    except IntegrityError as ie:
        return jsonify({"error": f"Curriculum ID not found: {ie}"}), 404
    
    except Exception as e:
        return jsonify({"error": f"Error fetching task list: {e}"}), 500

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

@app.route('/manage_classrooms', methods=['GET'])
def manage_classrooms():
    '''Route to draw the manage_classrooms page'''
    username = session.get('username')
    
    # Check if the user is an admin
    if not session.get('is_admin'):
        return redirect(url_for('index'))  # Redirect non-admin users

    return render_template('manage_classrooms.html', username=username)  # Render the content creation page

@app.route('/course_content', methods=['GET'])
def course_content():
    '''Route to draw the course_content page'''
    username = session.get('username')
    user_role = session.get('role')
    
    # Check if the user is an admin
    if not session.get('is_admin'):
        return redirect(url_for('index'))  # Redirect non-admin users

    return render_template('course_content.html', username=username, user_role=user_role)  # Render the content creation page
    
# Route to the admin content creation page "content"
@app.route('/question_content', methods=['GET'])
def question_content_page():
    
    username = session.get('username')
    
    # Check if the user is an admin
    if not session.get('is_admin'):
        return redirect(url_for('index'))  # Redirect non-admin users

    return render_template('question_content.html', username=username)  # Render the content creation page        

@app.route('/new_content_or_curriculum', methods=['GET', 'POST'])
def new_content_or_curriculum():
    '''Route to add new content or curriculum IDs'''
    
    # Retrieve the username from session
    username = session.get('username')
    
    # Extract the new content_id
    new_content = request.get_json()
    content_id = new_content['data']
    table = new_content['table']
    
    try:
        add_new_content(content_id, table, username, app.logger)
        return jsonify({"message": "New content added"}), 201
    
    except IntegrityError as ie:
        return jsonify({"error": f"Content ID already exists: {ie}"}), 409
    
    except Exception as e:
        return jsonify({"error": f"Database Error: {e}"}), 500
    
@app.route('/question_keys', methods=['GET'])
def question_keys():
    try:
        user_id = session.get('user_id')
        task_keys = fetch_task_keys(user_id, app.logger)
        return jsonify({"keys": task_keys}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to load keys: {e}"}), 500

@app.route('/assign_curriculum_to_content', methods=['POST'])
def assign_curriculum_to_content():
    '''Route to write content + base curriculum assignments to database'''

    # Check if the user is an admin
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized access'}), 403  # Return 403 Forbidden instead of redirect

    # Extract data safely
    try:
        content_assignments = request.get_json()
        content_id = content_assignments.get('content_id')
        base_curriculums = content_assignments.get('base_curriculums', [])

        if not content_id or not isinstance(base_curriculums, list):
            return jsonify({'error': 'Invalid request format'}), 400  # Return 400 Bad Request

        # Call the helper function to write to the database
        update_content_assignments(content_assignments, app.logger)

        return jsonify({'message': 'Content assignments updated successfully'}), 200

    except ValueError as ve:
        app.logger.error(f"Value Error: {ve}")
        return jsonify({'error': str(ve)}), 400  # Return a meaningful error

    except KeyError as ke:
        app.logger.error(f"Missing Key Error: {ke}")
        return jsonify({'error': f'Missing key: {ke}'}), 400  # Return missing key error

    except Exception as e:
        app.logger.error(f"Unexpected Error: {e}")
        return jsonify({'error': 'Internal server error'}), 500  # Generic internal error

@app.route('/assign_tasks_to_curriculum', methods=['GET', 'POST'])
def assign_tasks_to_curriculum():
    '''Route to assign tasks to a curriculum in the database'''
    
    # # Check if the user is an admin
    if not session.get('is_admin'):
        return redirect(url_for('index'))  # Redirect non-admin users
    
    # Extract the curriculum_id and task_list
    curriculum_assignments = request.get_json()
    curriculum_id = curriculum_assignments['curriculum_id']
    task_list = curriculum_assignments['task_list']
    
    # Call the helper function to write to the database
    update_curriculum_assignments(curriculum_assignments, app.logger)
        
    return jsonify({'content': 'Request received'}), 200

@app.route('/submit_question', methods=['POST'])
@login_required
def submit_question():
    """Saves a new question or updates an existing question in the database."""
    try:
        # Authorization check
        username = session.get('username')
        user_id = session.get('user_id')
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
        is_new = question_key not in fetch_task_keys(user_id, app.logger)
        app.logger.debug(f"New question? {is_new}")

        if is_new:
            # Handle new question insertion
            question_data['task_key'] = question_key
            new_question(question_data, username, app.logger)
            return jsonify({"message": "New question added."}), 201

        # Handle question update
        update_message = update_question(question_key, question_data, app.logger)
        return jsonify({"message": update_message}), 200

    except Exception as e:
        app.logger.error(f"Error in /submit_question: {e}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@app.route('/question_content', methods=['POST'])
def question_content():
    '''This function gets a question for the testprep page'''
    
    #Extract the question key from the request
    data = request.get_json()
    question_id = data.get('questionKey')  # formerly .lower()
    
    # Create a question object that retrieves the question data as an attribute
    question_data = fetch_question(question_id, app.logger)
    
    # Respond to the request by returning the data as a json
    response = jsonify(question_data)
    response.headers['Content-Type'] = 'application/json; charset=UTF-8'
    return response

@app.route('/new_classroom', methods=['POST'])
def new_classroom():
    '''Route to add new classroom and description'''
    
    # Extract the classroom code and description
    data = request.get_json()
    class_code = data['data'][0]
    class_description = data['data'][1]
    
    try:
        app.logger.debug(f"Pre-call: class_code: {class_code}")
        add_new_classroom(class_code, class_description, app.logger)
        return jsonify({"message": "New classroom added"}), 201
    
    except IntegrityError as ie:
        return jsonify({"error": f"Classroom ID already exists: {ie}"}), 409
    
    except Exception as e:
        return jsonify({"error": f"Database Error: {e}"}), 500

@app.route('/classrooms', methods=['GET'])
def classrooms():
    '''route to fetch all classrooms for an admin'''
    
    try:
        classrooms = fetch_classrooms(app.logger)
        return jsonify({"data": classrooms}), 201
    except Exception as e:
        return jsonify({'error': e})

@app.route('/classroom_data', methods=['POST'])
def classroom_data():
    '''Route to get classroom data for manage_classrooms page'''
    
    # Extract the classroom code
    data = request.get_json()
    class_code = data['class_code']
    
    try:
        classroom_data = fetch_classroom_data(class_code, app.logger)
        return jsonify({'data': classroom_data}), 200
    except Exception as e:
        return jsonify({'error': f'Unexpected Error: {e}' })

@app.route('/assign_to_classroom', methods=['POST'])
def assign_to_classroom():
    '''Route to add students or content assignments to classroom'''
    
    # Extract the data
    data = request.get_json()
    class_code = data['classroom_code']
    students = data['students']  # student emails as list
    content = data['content'] # Content_ids as a list
    assignments = {'students': students, 'content': content}
    
    try:
        status = add_classroom_assignments(class_code, assignments, app.logger) #update_classroom_student_assignments(class_code=class_code, students=students, logger=app.logger)

        # Return message if some emails were not found
        if status['not_found_emails']:
            return jsonify({'message': f'Partial Update-The following emails were not found: {status["not_found_emails"]}'})
        
        # Check if there's an error message and raise an exception
        if status.get('error_msg'):  # Now checking error_msg
            raise Exception(status['error_msg'])
        
        return jsonify({'message': 'Data received!'}), 200

    except Exception as e:
        return jsonify({'error': f"Unexpected Error: {e}"}), 500
    
@app.route('/remove_from_classroom', methods=['POST'])
def remove_from_classroom():
    '''Route to remove students or content assignments from classroom'''
    
    # Extract the data
    data = request.get_json()
    class_code = data['classroom_code']
    students = data['students']  # student emails as list
    content = data['content'] # Content_ids as a list
    removals = {'students': students, 'content': content}
    app.logger.debug(f"Removals: {removals}")
    try:
        status = remove_classroom_assignments(class_code, removals, app.logger) #update_classroom_student_assignments(class_code=class_code, students=students, logger=app.logger)

        # Return message if some emails were not found
        if status['not_found_emails']:
            return jsonify({'message': f'Partial Update-The following emails were not found: {status["not_found_emails"]}'})
        
        # Check if there's an error message and raise an exception
        if status.get('error_msg'):  # Now checking error_msg
            raise Exception(status['error_msg'])
        
        return jsonify({'message': 'Data received!'}), 200

    except Exception as e:
        return jsonify({'error': f"Unexpected Error: {e}"}), 500
        
@app.route('/update_xp', methods=['POST'])
def update_xp():
    '''Route to get xp updates and post to the database'''
    
    try:
    
        # Extract the xp data from the request
        xp_data = request.get_json()
        
        # Update the xp_data to include username
        app.logger.debug(f"In Route: {xp_data}")
        
        # Call call the data helper function to update the database
        update_xp_data(xp_data, app.logger)
        
        # Return a sucess response for testing
        return jsonify({"status": "success", "message": "XP Data Received"}), 200
    
    except Exception as e:
        return jsonify({"status": "error", "message":str(e)}), 500
    
@app.route('/admin_content', methods=['GET'])
def admin_content():
    '''Gets content/curriculum pairings from database'''
    
    # Extract the username
    username = session.get('username')    
    
    try:
        course_content = fetch_admin_content(username, app.logger)
        
        return jsonify(course_content), 200
    except Exception as e:
        app.logger.error(f"Error in /course_data: {e}")
        return jsonify({'message': 'Error fetching course data'}), 500

@app.route('/student_assignments', methods=['GET', 'POST'])
def student_assignments():
    
    # Get user_id from session
    user_id = session.get("user_id")
    
    try:
        # Call the fetch_user_assignments function
        assignments = fetch_user_assignments(user_id, app.logger)
        return jsonify({'assignments': assignments}), 200
    
    except Exception as e:
        return jsonify({'error': f"Unexpected Error: {e}"}), 500

#------------------------------------------------------------------------------------------#

if __name__ == '__main__':
    app.run(debug=True)