# Import packages
import bcrypt
from flask import session, redirect, url_for, jsonify, has_request_context
from modules.models import db, User, Admin, Questions, XP, Content, Curriculum, Classroom, ClassroomUser
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime
from functools import wraps
from werkzeug.exceptions import Forbidden

####################################################################################
#### Default Variables #############################################################
####################################################################################

defaults = {    
                "assigned_content" : ["intro"],
                "assigned_curriculums" : ["intro"],
                "current_curriculum" : "intro",
                "current_question" : "tutorial.1.1",
                "content_scores" : {"tutorial":{"Earned":0, "Possible":0}},
                "curriculum_scores" : {"intro":{"Earned":0, "Possible":0}},
                "xp" : {"overallXP": 0.0, "certifications": {"tutorial": {"xp_1": 0}}}
            }

####################################################################################
#### Classes #######################################################################
####################################################################################

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
            # Start with the basic query
            query = self.model.query
            
            # Iterate through the kwargs and apply filters
            for key, value in kwargs.items():
                if isinstance(value, (tuple, list)) and len(value) == 2:
                    operator, comparison_value = value
                    if operator == 'gt':
                        # Apply greater-than comparison
                        query = query.filter(getattr(self.model, key) > comparison_value)
                    elif operator == 'lt':
                        # Apply less-than comparison
                        query = query.filter(getattr(self.model, key) < comparison_value)
                    # You can add more operators here if needed (like 'eq', 'gte', 'lte', etc.)
                else:
                    # For basic equality checks, use filter_by
                    query = query.filter_by(**{key: value})
            
            # Execute the query
            records = query.all()
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

    def get_column_values(self, column_name):
        '''fetch all values for a specified column in the table'''
        try:
            # Fetch the column from the model
            column = getattr(self.model, column_name)
            
            # Query all values from the column
            values = self.model.query.with_entities(column).all()
            
            # Extract values, place in list and return
            return [row[0] for row in values]
        except AttributeError:
            raise ValueError(f"Column '{column_name}' does not exist!")
        except SQLAlchemyError as e:
            raise e

####################################################################################
#### Decorators ####################################################################
####################################################################################

def login_required(f):
    """Decorator to check if user is logged in."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:  # Check if the username is in the session
            return redirect(url_for('index'))  # Redirect if not logged in
        return f(*args, **kwargs)  # Proceed with the original function if logged in
    return decorated_function

def role_required(role=None, restricted=False):
    def wrapper(func):
        @wraps(func)
        def inner(*args, **kwargs):
            # Get the username from the session
            username = session.get('username')  # Ensure that username is stored in the session
            if not username:
                return jsonify({"error": "Unauthorized"}), 401
            
            # Get the user record
            user = User.query.filter_by(username=username).first()
            if not user:
                return jsonify({"error": "User not found"}), 401
            
            # Get the user's role from the Admin table
            admin_record = Admin.query.filter_by(id=user.id).first()  # Assuming user.id = admin.id
            if not admin_record:
                return jsonify({"error": "Forbidden: User is not an admin"}), 403
            
            # Check if the user's role is allowed
            user_role = admin_record.role
            if role and user_role not in role:
                return jsonify({"error": "Forbidden: Insufficient role"}), 403

            # Handle restricted access
            if not restricted or admin_record.role == 'system':
                kwargs = {}
            else:
                kwargs['user_id'] = user.id
                kwargs['restricted'] = True            
            
            return func(*args, **kwargs)
        return inner
    return wrapper


####################################################################################
#### Functions# ####################################################################
####################################################################################

def verify(username, password):
    """Verify username and password"""
    try:
        user_crud = CRUDHelper(User)
        user = user_crud.read(username=username)[0]

        if user is None:
            return "Username not found"  # Return a user-friendly message

        # Check if the password matches
        if bcrypt.checkpw(password.encode('utf-8'), user.password_hash):
            return True  # Return True if the password matches

        return "Invalid password"  # Return a message for invalid password

    except Exception as e:
        return f"Error verifying user: {e}"  # General error message

def build_session(username, logger=None):
    '''This function builds requred session data'''
    
    # Get the user.id
    user = User.query.filter_by(username=username).first()
    user_id = user.id
    
    # Fetch admin status of user
    try:
        admin = Admin.query.filter_by(id=user_id).first()
        role = admin.role
    except:
        role = "student"
        
    logger.debug(f"Logging In:  Role: {role}")
        
    # Fetch the user.ids of all system level admin
    admin_crud = CRUDHelper(Admin)
    records = admin_crud.read()
    system_ids = [record.id for record in records if record.role == 'system']
    
    logger.debug(f"user: {username} ID: {user_id} role: {role} Admins: {system_ids}")
    
    # Build session variables
    session['username'] = username
    session['is_admin'] = role in ('teacher', 'system')
    session['user_id'] = user_id
    session['system_ids'] = system_ids
    session['role'] = role
    
def fetch_usernames():
    '''Function to fetch all usernames'''
    '''Need to add filter for user access based on classrooms'''
    
    users =  User.query.all()
    sorted_users = sorted([user.username for user in users])
    return sorted_users

def initialize_user_sessionStorage_data(username):
    '''Send user data from Server to Client for sessionStorage'''
    
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

def update_user_session_data(username, session_data, logger=None):
    '''Send user data from Client sessionStorage into server database'''
    
    try:
        user_crud = CRUDHelper(User)
        user = user_crud.read(username=username)[0]
        
        # Pre-process the updatedAt field
        if "updatedAt" in session_data:
            try:
                session_data["updatedAt"] = datetime.strptime(session_data["updatedAt"], "%Y-%m-%dT%H:%M:%S.%fZ")
            except ValueError:
                session_data["updatedAt"] = datetime.strptime(session_data["updatedAt"], "%Y-%m-%dT%H:%M:%S")
        
        # Prepare the data for update
        update_map = {
            "completedCurriculums": "completed_curriculums",
            "contentScores": "content_scores",
            "correctAnswers": "correct_answers",
            "currentCurriculum": "current_curriculum",
            "currentQuestionId": "current_question",
            "curriculumScores": "curriculum_scores",
            "incorrectAnswers": "incorrect_answers",
            "xp": "xp",
            "updatedAt": "updated_at"
        }
        update_data = {update_map[key]: value for key, value in session_data.items() if key in update_map}
        
        # Use the update method of CRUDHelper
        user_crud.update(user.id, **update_data)
        
    except SQLAlchemyError as se:
        db.session.rollback()
        if logger:
            logger.error(f"SQLAlchemyError: {se}")
        raise se
        
    except Exception as e:
        db.session.rollback()
        if logger:
            logger.error(f"Unexpected error: {e}")
        raise e
        
def create_new_user(username, password, email):
    '''This function does the CRUD for a new user'''
    
    try:
        user_crud = CRUDHelper(User)
        now = datetime.utcnow()
        
        new_user = user_crud.create(
            username=username,
            password_hash=password,
            email=email,
            assigned_content = defaults["assigned_content"],
            assigned_curriculums = defaults["assigned_curriculums"],
            current_curriculum = defaults["current_curriculum"],
            current_question = defaults["current_question"],
            content_scores = defaults["content_scores"],
            curriculum_scores = defaults["curriculum_scores"],
            xp = defaults["xp"],
            updated_at = now
            )
        
        return new_user.username
    
    except Exception as e:
        raise e

def fetch_user_data(username):
    '''Function to fetch user data by username'''
    user = User.query.filter_by(username=username).first()
    if user:
        user_data = {
            'email': user.email,
            'assigned_curriculums': user.assigned_curriculums,
            'completed_curriculums': user.completed_curriculums,
            'content_scores': user.content_scores,
            'correct_answers': user.correct_answers,
            'current_curriculum': user.current_curriculum,
            'current_question': user.current_question,
            'curriculum_scores': user.curriculum_scores,
            'incorrect_answers': user.incorrect_answers,
            'xp': user.xp,
            'assigned_content': user.assigned_content
        }
        return user_data
    else:
        return None

def update_user_data(username, changes, logger=None):
    '''Function to update server database with new user data'''
    user_crud = CRUDHelper(User)
    user = user_crud.read(username=username)[0]  # Retrieve user by username
    now = datetime.utcnow()

    if not user:
        raise Exception("User not found")

    updates = {}
    for key, value in changes.items():
        if key == 'password' and value:  # Special handling for password field
            key = 'password_hash'
            value = bcrypt.hashpw(value.encode('utf-8'), bcrypt.gensalt())
            
        if key in defaults and not value:
            value = defaults[key]

        if key in user.__dict__ and getattr(user, key) != value:
            updates[key] = value
            
        updates["updated_at"] = now

    if updates:
        try:
            user_crud.update(user.id, **updates)
        except Exception as e:
            logger.debug(f"Error updating user {username}: {e}")
            raise e

def delete_user(username, logger=None):
    '''Function to delete a user based on username'''
    '''Needs fix - teachers can only delete their own students'''
    user_crud = CRUDHelper(User)
    user = user_crud.read(username=username)[0]
    
    try:
        id = user.id
        user_crud.delete(id)
    except Exception as e:
        logger.debug(f"Error deleting user {username}: {e}")

def fetch_curriculum_task_list(curriculum_id, logger=None):
    '''This function fetches the array of tasks for a given curriculum'''
    
    try:
        # Create CRUD Helper
        c_CRUD = CRUDHelper(Curriculum)
        
        # get the task list
        record = c_CRUD.read(curriculum_id=curriculum_id)
        task_list = record[0].task_list
        
        # Return the task_list
        return task_list
    
    except IntegrityError as ie:
        #logger.debug(f"Curriculum ID not found: {ie}")
        raise ie
    
    except Exception as e:
        #logger.debug(f"Unexpected error reading database: {e}")
        raise e

def fetch_question(question_id, logger=None):
    '''Function to fetch question data from the database'''
    
    q_crud = CRUDHelper(Questions)
    q_content = {}
    
    try:
        record = q_crud.read(task_key = question_id)[0]
        q_content['Code'] = record.code
        q_content['Question'] = record.question
        q_content['Answer'] = record.answer
        q_content['Distractor1'] = record.distractor_1
        q_content['Distractor2'] = record.distractor_2
        q_content['Distractor3'] = record.distractor_3
        q_content['Description'] = record.description
        q_content['Video'] = record.video
        q_content['Difficulty'] = record.difficulty
        q_content['Tags'] = record.tags
    except IndexError as ie:
        return f"Question ID not in database: {ie}"
    except Exception as e:
        return f"Unexpected error: {e}"
    else:
        return q_content
        
def fetch_task_keys(user_id, logger):
    ''' Fetches task keys'''
    
    # Get the system_ids
    system_ids = session.get("system_ids")
    logger.debug(f"System IDs: {system_ids}")
    
    if user_id in system_ids:
        # system users see all task_keys
        task_keys = Questions.query.with_entities(Questions.task_key).all()
        
    else:
        # teachers see their task_keys and all system task_keys
        task_keys = (
            Questions.query
            .filter((Questions.creator_id == user_id) | (Questions.creator_id.in_(system_ids)))
            .with_entities(Questions.task_key)
            .all()
        )
    
    # return the keys as a list
    return [key[0] for key in task_keys]

def update_question(question_id, question_data, logger=None):
    """Updates a question in the database."""
    try:
        # Create the CRUDHelper object for the Questions table
        q_crud = CRUDHelper(Questions)

        # Retrieve the question by task_key
        question = q_crud.read(task_key=question_id)

        if not question:
            error_message = f"Question with task_key '{question_id}' not found."
            logger.warning(error_message)
            return error_message

        # Use the question's id to perform the update
        q_crud.update(id=question[0].id, **question_data)
        logger.info(f"Question '{question_id}' updated successfully.")
        return "Question successfully updated."

    except Exception as e:
        logger.error(f"Error updating question '{question_id}': {e}")
        raise

def new_question(question_data, username, logger=None):
    '''Writes a new question into the Questions table'''
    logger.debug(f"New Question by: {question_data}")
    try:
        # Get the user id from the user table
        user = User.query.filter_by(username=username).first()
        question_data['creator_id'] = user.id
        # Create the CRUDHelper object for the Questions table
        q_crud = CRUDHelper(Questions)
        
        # Use the create method to add the new question details
        new_record = q_crud.create(**question_data)
        logger.debug(f"New Question: {new_record}")
        return "Question successfully created."
    
    except Exception as e:
        logger.error(f"Error adding new question: {e}")
        
def update_xp_data(xp_data, logger=None):
    '''Function to update the XP table'''
    
    try:
        # Create the CRUDHelper for XP table
        xp_crud = CRUDHelper(XP)
        xp_crud.create(**xp_data)
       
        logger.debug(f"XP Data: {xp_data}")
        return "XP Table successfully updated"
        
    except SQLAlchemyError as se:
        logger.error(f"SQL Error: {se}")
        raise
        
    except Exception as e:
        logger.error(f"Unexpected Error: {e}")
        raise

def fetch_xp_data(user_id, last_fetched_date, logger=None):
    """Function to fetch incremental XP data for a user."""
    
    try:
        # Query the XP table for the user_id and filter by timestamp greater than last_fetched_date
        xp_crud = CRUDHelper(XP)
                
        # Convert last_fetched_date to a datetime object and make it naive (remove timezone)
        last_fetched_datetime = datetime.fromisoformat(last_fetched_date.replace('Z', '')).replace(tzinfo=None)
                
        # Query the XP table for entries with a timestamp greater than last_fetched_datetime
        new_xp_entries = xp_crud.read(user_id=user_id, timestamp=('gt', last_fetched_datetime))
        
        # Check if there are any new entries
        if new_xp_entries:
            # Find the most recent timestamp in the new entries
            most_recent_timestamp = max(entry.timestamp.replace(tzinfo=None) for entry in new_xp_entries)
            
            # Prepare the new XP data for return (with relevant fields)
            xp_data = [{
                "dXP": entry.dXP,
                "question_id": entry.question_id,
                "curriculum_id": entry.curriculum_id,
                "elapsed_time": entry.elapsed_time,
                "timestamp": entry.timestamp.replace(tzinfo=None)
            } for entry in new_xp_entries]
            
            # Return the data and the most recent timestamp
            return {
                "xpData": xp_data,
                "mostRecentDatetime": most_recent_timestamp.isoformat()  # Return as ISO 8601 string
            }
        else:
            # No new data, return None or an empty response
            return None

    except Exception as e:
        # Handle any exceptions
        print(f"Error fetching XP data: {e}")
        return None

def fetch_course_data(username, logger=None):
    '''Fetch all course content, base curriculums and custom curriculums'''
    try:
        # Fetch the user.id for filtering
        user_id = session.get("user_id")
        
        # Fetch the user.ids of all system level admin
        system_ids = session.get("system_ids")
        
        # Fetch all records from the Content table
        content_crud = CRUDHelper(Content)
        records = content_crud.read()
        
        # Construct the dictionary of all content and base curriculums
        content_dict = {
                        record.content_id: record.base_curriculums
                        for record in records
                        if user_id in system_ids or record.creator_id in (*system_ids, user_id)
                        }
        
        # Fetch the all curriculums list from the Curriculum table
        curriculum_crud = CRUDHelper(Curriculum)
        records = curriculum_crud.read()
        all_curriculums = [
                            record.curriculum_id 
                            for record in records 
                            if user_id in system_ids or record.creator_id in (*system_ids, user_id)]
        
        # Fetch all question IDs from the Questions table
        question_crud = CRUDHelper(Questions)
        records = question_crud.read()
        all_questions = [
                        record.task_key
                        for record in records
                        if user_id in system_ids or record.creator_id in (*system_ids, user_id)]
        
        # Build the curriculum dictionary from the Curriculum table
        records = curriculum_crud.read()
        curriculum_dict = {
                            record.curriculum_id: record.task_list
                            for record in records
                            if user_id in system_ids or record.creator_id in (*system_ids, user_id)}
        
        return {"content_dict": content_dict,
                "all_curriculums": all_curriculums,
                "all_questions": all_questions,
                "curriculum_dict": curriculum_dict}
        
    except Exception as e:
        if logger:
            logger.error(f"Problem getting course content: {e}")
        return {}

def fetch_classrooms(logger=None):
    '''Fetches classrooms for the user if an admin'''
    
    # Fetch the user.id and admin status for filtering
    user_id = session.get('user_id')
    role = session.get('role')
    
    try:
        all_classes = db.session.query(Classroom).all()
    
        if role == 'system':
            my_classes = [classroom.code for classroom in all_classes]
        elif role == 'teacher':
            my_classes = [classroom.code for classroom in all_classes if user_id == classroom.admin_id]
        else:
            raise Exception("User does not have access to manage classrooms")
            
        logger.debug(f"My Classes: {my_classes}")
        return my_classes
        
    except Exception as e:
        logger.debug(f"Error: {e}")

def fetch_classroom_data(class_code, logger=None):
    '''
    Function to fetch classroom data.
    Arg(s): class_code as string, logger as logger object
    Returns: Dictionary keys: emails, content - values as lists
    '''
    
    try:
        
        # Fetch the user.id and admin status for filtering
        system_ids = session.get('system_ids')
        user_id = session.get('user_id')
        logger.debug(f"Front - system_ids: {system_ids} - user_id: {user_id} - class_code: {class_code}")
        
        # Access needed data from Classroom table
        classroom = Classroom.query.filter_by(code=class_code).first()
        
        if not classroom:
            logger.debug(f"Classroom {class_code} not found")
            raise Exception
            
        logger.debug(f"Just prior to get admin_id - class_code: {class_code}")
        admin_id = classroom.admin_id
        class_id = classroom.id
        logger.debug(f"Classroom ID: {class_id}")
        
        # Verify the user.id is system or the creator of the class_code
        if not (user_id == admin_id or user_id in system_ids):
            raise Exception(f"User does not have access to classrom {class_code}")
        
        # User CRUDHelper to get records via ClassroomUser
        cu_helper = CRUDHelper(ClassroomUser)
        cu_users = cu_helper.read(classroom_id=class_id)
        logger.debug("ClassroomUser object ok")
        
        # Extract the user IDs from ClassroomUser records
        student_ids = [cu.user_id for cu in cu_users]
        logger.debug(f"User IDs: {student_ids}")
        
        # User CRUDHelper to get records from User
        u_helper = CRUDHelper(User)
        students = u_helper.read()
        students = [student for student in students if student.id in student_ids]
        logger.debug(f"Users: {students}")
        
        # Extract student emails from User records
        student_emails = [student.email for student in students if student.email]
        
        # Get assigned content from the classroom
        content = classroom.assigned_content
        
        return{'students': student_emails, 'content': content}
        
    except Exception as e:
        logger.debug(f"An unexpected error occurred: {e}")
        raise e

def update_classroom_assignments(class_code, students=None, content=None, logger=None):
    '''Write new student assignments for classrooms'''
    
    # Get admin credentials
    user_id = session.get('user_id')
    role = session.get('role')
    
    # Create a status dict to return
    status = {'error_msg': '', 'not_found_emails': []}
    
    try:
        if students:
            # Initialize not found email list
            
            # Fetch the classroom object by class_code
            classroom = Classroom.query.filter_by(code=class_code).first()
           
            
            if not classroom:
                status['error_msg'] = "Incorrect class_code"
                raise Exception(f"{status['error_msg']}")
                
            # Capture assigned_content array from classroom table for student assignment
            content_to_add = classroom.assigned_content
            
            # Fetch all users in one query and create a dictionary
            user_dict = {user.email: user for user in User.query.filter(User.email.in_(students)).all()}
            
            # Iterate through the list of student emails
            for email in students:
                # Fetch the User object by email address
                user = user_dict.get(email)
                
                if not user:
                    # If not a user, append to the not_found_emails list
                    status['not_found_emails'].append(email)
                    continue
                
                # Append class_code to user's classroom_codes array if not there already
                if class_code not in user.classroom_codes:
                    user.classroom_codes.append(class_code)
                    flag_modified(user, "classroom_codes")                
                
                # Assign the user to the classroom by adding a new record in ClassroomUsers
                classroom_user = ClassroomUser(classroom_id=classroom.id, user_id=user.id)
                db.session.add(classroom_user)
                
                # Update the user profile for content and curriculum assignments
                curriculums_to_add = []
                # Loop through each new content area to get the list of curriculums
                for content_name in content_to_add:
                    # get base_curriculums from content table
                    content_obj = Content.query.filter_by(content_id=content_name).first()
                    base_curriculums = content_obj.base_curriculums if content_obj else []
                    # Add these curriculums to the temporary list
                    curriculums_to_add.extend(base_curriculums)
                # Combine the new content from classroom assignment with existing content assigned user
                updated_content_list = list(set(user.assigned_content + content_to_add))
                logger.debug(f"Existing: {user.assigned_content} - New: {content_to_add} - All: {updated_content_list}")
                updated_curriculums_list = list(set(user.assigned_curriculums + curriculums_to_add))
                logger.debug(f"Existing: {user.assigned_curriculums} - New: {curriculums_to_add} - All: {curriculums_to_add}")
                # Update the user table with new assigned_content and assigned_curriculum
                user_crud = CRUDHelper(User)
                user_crud.update(user.id, assigned_content = sorted(updated_content_list), assigned_curriculums = sorted(updated_curriculums_list))
                    
                    
            
            # Commit all changes for students
            db.session.commit()
            
            # loop through the new students and update assigned content + curriculum in User
            
            
            
        return status
    
    except Exception as e:
        # Log the error and update the error code
        logger.debug(f"Error: {e}")
        status['error_msg'] = f'{e}'
        return status
        
def add_new_content(item_id, table, username, logger=None):
    '''
    Function to add a new content area to the content table
    Arg(s): unique content name, logger object
    Returns: Success code if unique content_id added
    '''    
    try:
        # Lookup user.id from username
        user = User.query.filter_by(username=username).first()
        
        if table == 'content':
            # Create helper for Content table
            c_CRUD = CRUDHelper(Content)
            # Add the new content_id
            c_CRUD.create(content_id = item_id, base_curriculums = [], creator_id=user.id)
            # Return a success message
            return f"content_id {item_id} added to the database"
        
        elif table == 'curriculum':
            # Create helper for Curriculum table
            c_CRUD = CRUDHelper(Curriculum)
            # Add the new curriculum_id
            c_CRUD.create(curriculum_id = item_id, task_list = [], creator_id=user.id)
            # Return a success message
            return f"curriculum_id {item_id} added to the database"
        
        else:
            raise Exception(f"Attempting to write to a non-existing table: {table}")
        
    except IntegrityError as ie:
        logger.debug(f"Item ID {item_id} not unique: {ie}")
        raise ie
    except Exception as e:
        logger.debug(f"Unexpected error writing item ID {item_id} to the database: {e}")
        raise e

def update_content_assignments(data, logger=None):
    '''Function to update assignment of content to base_curriculums'''
    
    try:
        # Create the CRUD helper for content table
        c_CRUD = CRUDHelper(Content)
        
        # Get the record matching the content_id
        record = c_CRUD.read(content_id = data["content_id"])
        
        # Update the the base curriculum assignment
        c_CRUD.update(record[0].id, base_curriculums = data["base_curriculums"])
        logger.debug(f"Content: {data['content_id']} Base: {data['base_curriculums']}")
        
    except Exception as e:
        logger.debug(f"Error: {e}")
        
def update_curriculum_assignments(data, logger=None):
    '''Function to update assignment of tasks to curriculums'''
    
    try:
        # Create the CRUD helper for content table
        c_CRUD = CRUDHelper(Curriculum)
        
        # Get the record matching the content_id
        record = c_CRUD.read(curriculum_id = data["curriculum_id"])
        
        # Update the the base curriculum assignment
        c_CRUD.update(record[0].id, task_list = data["task_list"])
        logger.debug(f"Content: {data['curriculum_id']} Base: {data['task_list']}")
        
    except Exception as e:
        logger.debug(f"Error: {e}")

def add_new_classroom(class_code, class_description, logger=None):
    '''Function to write new classroom code and description to database'''
    
    try:
        # Extract user credentials
        user_id = session.get("user_id")
        role = session.get("role")
        logger.debug(f"Add Classroom Role: {user_id} - {role}")
        
        # Ensure the user adding the classroom is an admin
        if role not in ['teacher', 'system']:
            raise Exception("Only Admins can create classrooms!")
        
        # Create the classroom CRUD helper
        class_CRUD = CRUDHelper(Classroom)
        
        # Create the new classroom record
        class_CRUD.create(code = class_code, name = class_description, admin_id = user_id)
        
        # Return success message        
        return f"Classroom: {class_code} successfully added!"
    
    except IntegrityError as ie:
        logger.debug(f"Classroom Code {class_code} not unique!")
        raise ie
        
    except Exception as e:
        logger.debug(f"Unexpected error writing classroom {class_code} to database: {e}")
        raise e