# Import packages
import bcrypt, itertools
from flask import session, redirect, url_for, jsonify, has_request_context
from modules.models import *
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime
from functools import wraps
from werkzeug.exceptions import Forbidden, BadRequest, Unauthorized

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
    ### No change needed for new schema ###
    
    # Get the user.id
    user = User.query.filter_by(username=username).first()
    user_id = user.id
    
    # Fetch admin status of user
    try:
        admin = Admin.query.filter_by(id=user_id).first()
        role = admin.role
    except:
        role = "student"
                
    # Fetch the user.ids of all system level admin
    admin_crud = CRUDHelper(Admin)
    records = admin_crud.read()
    system_ids = [record.id for record in records if record.role == 'system']
        
    # Build session variables
    session['username'] = username
    session['is_admin'] = role in ('teacher', 'system')
    session['user_id'] = user_id
    session['system_ids'] = system_ids
    session['role'] = role
    
def fetch_usernames():
    '''
    Function to fetch all usernames for a teacher or system admin
    
    Notes:
        - called in the /get_users route for the user_data.html page
        - Results should be filtered so teachers only see users enrolled in one of their classrooms
        - System admin see all users
    
    '''

    # Fetch the user's ID and role, only admins see all users
    # Teachers only see students enrolled in their classrooms
    user_id = session.get('user_id')
    role = session.get('role')

    try:
        if role == 'teacher':
            # Initialize my_usernames
            my_usernames = []

            # Query all students enrolled in classrooms of the teacher
            students = db.session.query(User.username).\
                join(ClassroomUser, ClassroomUser.user_id == User.id).\
                join(Classroom, Classroom.id == ClassroomUser.classroom_id).\
                filter(Classroom.admin_id == user_id).\
                all()

            # Extract the usernames from the query result
            my_usernames = [username[0] for username in students]

            if my_usernames:
                return sorted(my_usernames)
            else:
                raise BadRequest("You need to have 1 or more students enrolled in 1 or more classrooms!")

        elif role == 'system':
            # System users see all usernames in the database
            users = User.query.all()
            return sorted([user.username for user in users])

        else:
            raise Unauthorized("Not Authorized!")

    except BadRequest as br:
        raise br    
    
    except Unauthorized as u:
        raise u

    except Exception as e:
        raise e     

def fetch_user_ids():
    '''
    Function to fetch all User.id for a teacher or system admin
    
    Notes:
        - Results should be filtered so teachers only see user.ids enrolled in one of their classrooms
        - System admin see all user.ids
    
    '''

    # Fetch the user's ID and role, only admins see all users
    # Teachers only see students enrolled in their classrooms
    user_id = session.get('user_id')
    role = session.get('role')

    try:
        if role == 'teacher':
            # Initialize my_usernames
            my_ids = []

            # Query all students enrolled in classrooms of the teacher
            students = db.session.query(User.id).\
                join(ClassroomUser, ClassroomUser.user_id == User.id).\
                join(Classroom, Classroom.id == ClassroomUser.classroom_id).\
                filter(Classroom.admin_id == user_id).\
                all()

            # Extract the usernames from the query result
            my_ids = [id[0] for id in students]

            if my_ids:
                return sorted(my_ids)
            else:
                raise BadRequest("You need to have 1 or more students enrolled in 1 or more classrooms!")

        elif role == 'system':
            # System users see all usernames in the database
            users = User.query.all()
            return sorted([user.id for user in users])

        else:
            raise Unauthorized("Not Authorized!")

    except BadRequest as br:
        raise br    
    
    except Unauthorized as u:
        raise u

    except Exception as e:
        raise e

def initialize_user_sessionStorage_data(logger=None):
    '''
    Send user data from Server to Client for sessionStorage
    
    Notes:
        - This function initializes the client side sessionStorage data
        - This is student related data (i.e., coursework related)
    '''
    
    try:
        
        # Get the user.id from session data
        user_id = session.get('user_id')
        
        # Query all classrooms this user is enrolled in
        all_classrooms = {c.classroom_id for c in ClassroomUser.query.with_entities(ClassroomUser.classroom_id).filter_by(user_id=user_id).all()}
        
        # Query all content_id that are assigned to all classroom_id in ClassroomContent
        all_classroom_content_ids = {c.content_id for c in ClassroomContent.query.with_entities(ClassroomContent.content_id).filter(ClassroomContent.classroom_id.in_(all_classrooms)).all()} if all_classrooms else set()
        
        # Query all content_id that are assigned directly to the user in UserContent
        all_user_content_ids = {c.content_id for c in UserContent.query.with_entities(UserContent.content_id).filter_by(user_id=user_id).all()}
        
        # Combine both sets
        all_user_content = all_classroom_content_ids | all_user_content_ids
        
        # Query Content table to get the content_id for each Content.id
        content_query = Content.query.with_entities(Content.content_id).filter(Content.id.in_(all_user_content)).all()
        
        # Extract content_id values
        assigned_content = [c[0] for c in content_query]

        # Now query curriculums - all curriculums assigned to assigned_content plus any from CurriculumUser
        # First get all curriculums assigned to all_user_content
        # Query all content_id that are assigned to all classroom_id in ClassroomContent
        all_content_curriculum_ids = {c.curriculum_id for c in ContentCurriculum.query.with_entities(ContentCurriculum.curriculum_id).filter(ContentCurriculum.content_id.in_(all_user_content)).all()} if all_user_content else set()
        
        # Now query all user_curriculum_ids
        # Query all content_id that are assigned directly to the user in UserContent
        all_user_curriculum_ids = {c.curriculum_id for c in UserCurriculum.query.with_entities(UserCurriculum.curriculum_id).filter_by(user_id=user_id).all()}
        
        # combine both sets
        all_user_curriculums = all_content_curriculum_ids | all_user_curriculum_ids
        
        # Query Curriculum table to get the curriculum_id for each Curriculum.id
        curriculum_query = Curriculum.query.with_entities(Curriculum.curriculum_id).filter(Curriculum.id.in_(all_user_curriculums)).all()
        
        # Extract the curriculum id values
        assigned_curriculums = [c[0] for c in curriculum_query]

        # Query the User table for the other session data
        user = User.query.filter_by(id=user_id).first()
        logger.debug(f"")
        
        
        # Update session data with the basic fields
        session_data = {
                        "assignedContent": assigned_content,
                        "assignedCurriculums": assigned_curriculums,
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

def update_user_session_data(session_data, logger=None):
    '''
    Send user data from Client sessionStorage into server database
    
    Notes:
        - This function is sued to update the database with the sessionStorage data
        - This function deals with student data
    '''
    
    try:        
        
        # Fetch user.id from session
        user_id = session.get('user_id')
        
        user_crud = CRUDHelper(User)
        user = user_crud.read(id=user_id)[0]
        
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

def fetch_user_data(username, logger=None):
    '''
    Function to fetch user data by username
    
    Notes:
        - This function is used in the /get_user_data route
        - It is used to populate information in the user_data.html page
    '''
    
    # Fetch the user_id belonging to the student username passed
    user_id = db.session.query(User.id).filter_by(username = username).scalar()
    
    
    # Get Content.id array assigned in UserContent
    content_ids = db.session.query(UserContent.content_id).filter_by(user_id=user_id).all()
    content_ids = [c[0] for c in content_ids]
    
    # Fetch the corresponding content_id from the Content table
    contents = db.session.query(Content.content_id).filter(Content.id.in_(content_ids)).all()
    contents = [c for c in contents]
    
    # Get Curriculum.id array assigned in UserCurriculum
    curriculum_ids = db.session.query(UserCurriculum.curriculum_id).filter_by(user_id=user_id).all()
    curriculum_ids = [c[0] for c in curriculum_ids]
    
    # Fetch the corresponding curriculum_id data from the Curriculum table
    curriculums = db.session.query(Curriculum.curriculum_id).filter(Curriculum.id.in_(curriculum_ids)).all()
    curriculums = [c for c in curriculums]
    
    # Query the username of the student
    user = User.query.filter_by(username=username).first()
    
    assigned_content = [c[0] for c in contents]
            
    if user:
        user_data = {
            'email': user.email,
            'assigned_curriculums': [c[0] for c in curriculums],
            'completed_curriculums': user.completed_curriculums,
            'content_scores': user.content_scores,
            'correct_answers': user.correct_answers,
            'current_curriculum': user.current_curriculum,
            'current_question': user.current_question,
            'curriculum_scores': user.curriculum_scores,
            'incorrect_answers': user.incorrect_answers,
            'xp': user.xp,
            'assigned_content': [c[0] for c in contents]
        }
        return user_data
    else:
        return None

def update_user_data(username, changes, logger=None):
    '''
    Function to update server database with new user data
    
    Arg(s):
        - username as string, changes as dictionary, logger as app.logger
    
    Notes:
        - Function is called in the /update_user route
        - GETs information from user_data.html and POSTs it to the database
    
    '''

    # Fetch the user_id belonging to the student username passed
    user_id = db.session.query(User.id).filter_by(username = username).scalar()
    
    # Break out assigned_curriculum and assigned_content from changes    
    assigned_content = changes.pop('assigned_content')
    assigned_curriculums = changes.pop('assigned_curriculums')
    removed_content = changes.pop('removed_content')
    removed_curriculums = changes.pop('removed_curriculums')    
    
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
        
    if assigned_content:
        # Query existing user-content relationships
        existing_content_ids = {uc.content_id for uc in db.session.query(UserContent.content_id)
                                .filter(UserContent.user_id == user_id, UserContent.content_id.in_(
            db.session.query(Content.id).filter(Content.content_id.in_(assigned_content))
        )).all()}
    
        # Get content.id values
        content_records = db.session.query(Content.id).filter(Content.content_id.in_(assigned_content)).all()
        content_ids_map = {record.id for record in content_records}
    
        # Determine which content_ids are new (not in existing_content_ids)
        new_content_ids = content_ids_map - existing_content_ids
    
        # Insert only new entries
        user_content_entries = [UserContent(user_id=user_id, content_id=content_id) for content_id in new_content_ids]
        
        if user_content_entries:
            db.session.bulk_save_objects(user_content_entries)

    if assigned_curriculums:
        # Query existing user-curriculum relationships
        existing_curriculum_ids = {uc.curriculum_id for uc in db.session.query(UserCurriculum.curriculum_id)
                                   .filter(UserCurriculum.user_id == user_id, UserCurriculum.curriculum_id.in_(
            db.session.query(Curriculum.id).filter(Curriculum.curriculum_id.in_(assigned_curriculums))
        )).all()}
    
        # Get curriculum.id values
        curriculum_records = db.session.query(Curriculum.id).filter(Curriculum.curriculum_id.in_(assigned_curriculums)).all()
        curriculum_ids_map = {record.id for record in curriculum_records}
    
        # Determine which curriculum_ids are new (not in existing_curriculum_ids)
        new_curriculum_ids = curriculum_ids_map - existing_curriculum_ids
    
        # Insert only new entries
        user_curriculum_entries = [UserCurriculum(user_id=user_id, curriculum_id=curriculum_id) for curriculum_id in new_curriculum_ids]
        
        if user_curriculum_entries:
            db.session.bulk_save_objects(user_curriculum_entries)
            
    if removed_content:
        
        # First fetch the Content.id for each of the Content.content_id contained in the removed_content list
        content_query = db.session.query(Content.id).filter(Content.content_id.in_(removed_content)).all()
        content_ids = [c[0] for c in content_query]
        
        # Remove the each of the Content.id for User.id in the ContentUser table
        db.session.query(UserContent).filter(
            UserContent.user_id == user_id,
            UserContent.content_id.in_(content_ids)
        ).delete(synchronize_session=False)        
        
    if removed_curriculums:
        
        # First fetch the Curriculum.id for each of the Curriculum.curriculum_id contained in the removed_curriculums list
        curriculum_query = db.session.query(Curriculum.id).filter(Curriculum.curriculum_id.in_(removed_curriculums)).all()
        curriculum_ids = [c[0] for c in curriculum_query]
        
        # Remove the each of the Content.id for User.id in the ContentUser table
        db.session.query(UserCurriculum).filter(
            UserCurriculum.user_id == user_id,
            UserCurriculum.curriculum_id.in_(curriculum_ids)
        ).delete(synchronize_session=False)
    
    if assigned_content or assigned_curriculums or removed_content or removed_curriculums:
        db.session.commit()

    if updates:
        try:
            user_crud.update(user.id, **updates)
        except Exception as e:
            logger.debug(f"Error updating user {username}: {e}")
            raise e

def delete_user(username, logger=None):
    '''Function to delete a user based on username'''
    
    # Fetch usernames
    my_users = fetch_usernames()
    
    if username in my_users:
    
        # Create CRUDHelper oblect
        user_crud = CRUDHelper(User)
        user = user_crud.read(username=username)[0]
        
        try:
            id = user.id
            user_crud.delete(id)
        except Exception as e:
            logger.debug(f"Error deleting user {username}: {e}")

def fetch_curriculum_task_list(curriculum_id, logger=None):
    '''This function fetches the array of tasks for a given curriculum'''
    ### CHANGE needed for new schema ###
    
    try:
        # Get the Curriculum.id from the curriculum_id
        curriculum_id = db.session.query(Curriculum.id).filter_by(curriculum_id = curriculum_id).scalar()
        
        # Get all tasks assigned to that Curriculum.id from the CurriculumQuestions table
        if curriculum_id:
            c_questions = db.session.query(CurriculumQuestion.question_id).filter_by(curriculum_id=curriculum_id).all()
            question_ids = [q[0] for q in c_questions]
            
        # From question ids above get task_keys from Questions table
        if question_ids:
            questions = db.session.query(Questions.task_key).filter(Questions.id.in_(question_ids)).all()
            task_list = [t[0] for t in questions]
        
        # Return the task_list
        return task_list
    
    except IntegrityError as ie:
        raise ie
    
    except Exception as e:
        raise e

def fetch_question(question_id, logger=None):
    '''
    Function to fetch question data from the database
    
    Notes: 2/16/25 adding content, subject, objective
    
    '''
    
    q_crud = CRUDHelper(Questions)
    q_content = {}
    
    try:
        record = q_crud.read(task_key = question_id)[0]
        
        # The content_id is Content.id - use that to get Content.content_id
        #content_query = Content.query.filter_by(id=record.content_id).first()
        #q_content['Content'] = content_query.content_id
        
        # The rest of the items come from the user CRUD
        q_content['Content'] = record.content_id
        q_content['Standard'] = record.standard
        q_content['Objective'] = record.objective
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
        
def fetch_task_keys(user_id, logger=None):
    ''' Fetches task keys'''
    ### CHANGE MIGHT BE needed for new schema ###
    
    # Get the session data
    system_ids = session.get("system_ids")
    
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
    ### No change needed for new schema ###
    
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
    ### No change needed for new schema ###
    
    try:
        # Get the user id from the user table
        user = User.query.filter_by(username=username).first()
        question_data['creator_id'] = user.id
        # Create the CRUDHelper object for the Questions table
        q_crud = CRUDHelper(Questions)
        
        # Use the create method to add the new question details
        new_record = q_crud.create(**question_data)
        return "Question successfully created."
    
    except Exception as e:
        logger.error(f"Error adding new question: {e}")
        
def update_xp_data(xp_data, logger=None):
    '''Function to update the XP table'''
    ### No change needed for new schema ###
    
    try:
        # Create the CRUDHelper for XP table
        xp_crud = CRUDHelper(XP)
        xp_crud.create(**xp_data)
       
        return "XP Table successfully updated"
        
    except SQLAlchemyError as se:
        logger.error(f"SQL Error: {se}")
        raise
        
    except Exception as e:
        logger.error(f"Unexpected Error: {e}")
        raise

def fetch_xp_data(user_id, last_fetched_date, logger=None):
    """Function to fetch incremental XP data for a user."""
    ### No change needed for new schema ###
    
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
    '''
    Fetch content, base curriculums, and custom curriculums for an admin.
    
    Notes:
        - Teachers only see their own content, curriculums and questions
    '''
    try:
        # Fetch the user.id for filtering
        user_id = session.get("user_id")
        role = session.get("role")

        # Query all Content.id and Content.content_id from the Content table
        content_data = db.session.query(Content.id, Content.content_id)

        if role == 'teacher':
            content_data = content_data.filter(Content.creator_id == user_id).all()
        elif role == 'system':
            content_data = content_data.all()  # Fix: Don't overwrite, just execute query
        else:
            raise Unauthorized("User not authorized!")

        # Convert query result to dictionary
        all_content_dict = {content_id: content_key for content_id, content_key in content_data}

        # Query all Curriculum.id and Curriculum.curriculum_id
        curriculum_data = db.session.query(Curriculum.id, Curriculum.curriculum_id)

        if role == 'teacher':
            curriculum_data = curriculum_data.filter(Curriculum.creator_id == user_id).all()
        elif role == 'system':
            curriculum_data = curriculum_data.all()  # Fix: Don't overwrite
        else:
            raise Unauthorized("User not authorized!")

        # Convert curriculum query result to dictionary
        all_curriculum_dict = {curriculum_id: curriculum_key for curriculum_id, curriculum_key in curriculum_data}

        # Query all ContentCurriculum assignments
        assignment_data = db.session.query(ContentCurriculum.content_id, ContentCurriculum.curriculum_id).all()

        # Build dictionary of ContentCurriculum Assignments
        all_assignment_dict = {}
        for content_id, curriculum_id in assignment_data:
            if content_id not in all_assignment_dict:
                all_assignment_dict[content_id] = []
            all_assignment_dict[content_id].append(all_curriculum_dict.get(curriculum_id, None))  # Fix: Avoid KeyError

        # Build the content_dict
        content_dict = {}
        for content_id, content_key in all_content_dict.items():
            content_dict[content_key] = all_assignment_dict.get(content_id, [])  # Fix: Default empty list

        # Get all curriculums as a list
        all_curriculums = list(all_curriculum_dict.values())

        # Query all question IDs from Questions
        question_data = db.session.query(Questions.id, Questions.task_key)

        if role == 'teacher':
            question_data = question_data.filter(Questions.creator_id == user_id)
        elif role == 'system':
            question_data = question_data.all()
        else:
            raise Unauthorized("User not authorized!")
            
        # Get a list of all questions using task_key
        all_questions_dict = {question_id: question_key for question_id, question_key in question_data}
        all_questions = list(all_questions_dict.values())
    
        # Query all CurriculumQuestion assignments
        assignment_data = db.session.query(CurriculumQuestion.curriculum_id, CurriculumQuestion.question_id).all()

        # Build dictionary of CurriculumQuestion Assignments
        all_assignment_dict = {}
        for curriculum_id, question_id in assignment_data:
            curriculum = all_curriculum_dict[curriculum_id]
            if curriculum not in all_assignment_dict:
                all_assignment_dict[curriculum] = []
            all_assignment_dict[curriculum].append(all_questions_dict.get(question_id, None))
            
        curriculum_dict = all_assignment_dict

        return {
            "content_dict": content_dict,
            "all_curriculums": all_curriculums,
            "all_questions": all_questions,
            "curriculum_dict": curriculum_dict
        }

    except Exception as e:
        if logger:
            logger.error(f"Problem getting course content: {e}")
        raise

def fetch_classrooms(logger=None):
    '''Fetches classrooms for the user if an admin'''
    ### No change needed for new schema ###
    
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
            
        return my_classes
        
    except Exception as e:
        logger.debug(f"Error: {e}")

def fetch_classroom_data(class_code, logger=None):
    '''
    Function to fetch classroom data.
    Arg(s): class_code as string, logger as logger object
    Returns: Dictionary keys: emails, content - values as lists
    '''
    ### CHANGE needed for new schema ###
    
    try:
        
        # Fetch the user.id and admin status for filtering
        system_ids = session.get('system_ids')
        user_id = session.get('user_id')
        role = session.get('role')
        
        # Access needed data from Classroom table
        classroom = Classroom.query.filter_by(code=class_code).first()
        
        if not classroom:
            logger.debug(f"Classroom {class_code} not found")
            raise Exception
            
        admin_id = classroom.admin_id
        class_id = classroom.id
        
        # Verify the user.id is system or the creator of the class_code
        if not (user_id == admin_id or role in ('system', 'teacher')):
            raise Exception(f"User does not have access to classroom {class_code}")
        
        # User CRUDHelper to get records via ClassroomUser
        cu_helper = CRUDHelper(ClassroomUser)
        cu_users = cu_helper.read(classroom_id=class_id)
        
        # Extract the user IDs from ClassroomUser records
        student_ids = [cu.user_id for cu in cu_users]
        
        # User CRUDHelper to get records from User
        u_helper = CRUDHelper(User)
        students = u_helper.read()
        students = [student for student in students if student.id in student_ids]
        
        # Extract student emails from User records
        student_emails = [student.email for student in students if student.email]
        
        # Get content already assigned to this classroom
        content_query = db.session.query(ClassroomContent.content_id).filter_by(classroom_id=class_id).all()
        content_ids = [c[0] for c in content_query]
        
        # Query the content names from the Content table give Content.id above
        content_query = Content.query.filter(Content.id.in_(content_ids)).all()
        assigned_content = [c.content_id for c in content_query]
        
        # Query all content areas filtered for teachers - all for system admin
        if role == 'system':
            available_content = Content.query.with_entities(Content.content_id).all()
        else:
            available_content = (
                Content.query
                .filter((Content.creator_id == user_id) | (Content.creator_id.in_(system_ids)))
                .with_entities(Content.content_id)
                .all()
            )
        
        available_content = [c[0] for c in available_content]
        logger.debug(f"Available Content: {available_content} - System IDs: {system_ids}")
        
        logger.debug(f"Content: {content_ids}")

        return{'students': student_emails, 'availableContent': available_content, 'assignedContent': assigned_content}
        
    except Exception as e:
        logger.debug(f"An unexpected error occurred: {e}")
        raise e

def add_classroom_assignments(class_code, assignments, logger=None):
    '''
    Write new student and assignments for classrooms to the database
    
    Arg(s): class_code as string, assignments as dict, logger as app.logger
    
    Returns: status dictionary with further instructions for route server
    
    Notes:
        - This function updates the student.id and content.id assigned to classroom.id
        - This only updates the ClassroomUser and/or ClassroomContent
        - This function only works to add students/content to a classroom, not remove
    '''
    
    # Get admin credentials
    user_id = session.get('user_id')
    role = session.get('role')
    
    # Create a status dict to return
    status = {'error_msg': '', 'not_found_emails': []}
    
    # Extract the assignments data
    students = assignments['students']
    content = assignments['content']
    
    # Create the classroom object here and pass as arg
    # Fetch the classroom object by class_code
    classroom = Classroom.query.filter_by(code=class_code).first()
    
    if not classroom:
        status['error_msg'] = "Incorrect class_code"
        raise Exception(f"{status['error_msg']}")
        
    # Extract the Classroom.id
    class_id = classroom.id
        
    try:
        
        if students:
        
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
                
                # Assign the user to the classroom by adding a new record in ClassroomUsers
                classroom_user = ClassroomUser(classroom_id=classroom.id, user_id=user.id)
                db.session.add(classroom_user)
                     
        if content:
    
            # Fetch the content objects
            content_records = db.session.query(Content).filter(Content.content_id.in_(content)).all()
            content_ids = [c.id for c in content_records]
        
            # Get existing records in ClassroomContent to prevent duplicates
            existing_records = db.session.query(ClassroomContent.content_id).filter_by(classroom_id=class_id).all()
            existing_content_ids = {record.content_id for record in existing_records}  # Convert to set for fast lookup
        
            # Create new entries excluding duplicates
            new_entries = [
                ClassroomContent(classroom_id=class_id, content_id=content_id)
                for content_id in content_ids if content_id not in existing_content_ids
            ]
        
            # Bulk insert new entries
            if new_entries:
                db.session.bulk_save_objects(new_entries)
        
    except Exception as e:
        # Log the error and update the error code
        logger.debug(f"Error: {e}")
        status['error_msg'] = f'{e}'
        return status
    
    db.session.commit()

    return status    

def remove_classroom_assignments(class_code, removals, logger=None):
    '''
    Remove student and content assignments for a classroom from the database
    
    Arg(s): class_code as string, removals as dict, logger as app.logger
    
    Returns: status dictionary with further instructions for route server
    
    Notes:
        - This function updates the student.id and content.id assigned to classroom.id
        - This only updates the ClassroomUser and/or ClassroomContent
        - This function only works to remove students/content to a classroom, not add
    '''
    
    # Get admin credentials
    user_id = session.get('user_id')
    role = session.get('role')
    
    # Create a status dict to return
    status = {'error_msg': '', 'not_found_emails': []}
    
    # Extract the assignments data
    students = removals['students']
    content = removals['content']
    
    # Create the classroom object here and pass as arg
    # Fetch the classroom object by class_code
    classroom = Classroom.query.filter_by(code=class_code).first()
    
    if not classroom:
        status['error_msg'] = "Incorrect class_code"
        raise Exception(f"{status['error_msg']}")
        
    # Extract the Classroom.id
    class_id = classroom.id
        
    try:
        
        if students:
        
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
                
                # Delete the ClassroomUser record
                db.session.query(ClassroomUser).filter_by(classroom_id=class_id, user_id=user.id).delete()
        
                     
        if content:
    
            # Fetch the content objects
            content_records = db.session.query(Content).filter(Content.content_id.in_(content)).all()
            content_ids = [c.id for c in content_records]
        
            # Bulk delete content records from ClassroomContent
            db.session.query(ClassroomContent).filter(
                ClassroomContent.classroom_id == class_id,
                ClassroomContent.content_id.in_(content_ids)
            ).delete(synchronize_session=False)
    
        db.session.commit()

        return status

    except Exception as e:
        # Log the error and update the error code
        logger.debug(f"Error: {e}") if logger else print(f"Error: {e}")
        status['error_msg'] = f'{e}'
        return status
        
def add_new_content(item_id, table, username, logger=None):
    '''
    Function to add a new content area to the content table
    Arg(s): unique content name, logger object
    Returns: Success code if unique content_id added
    '''
    ### CHANGE needed for new schema ###
    
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
            c_CRUD.create(curriculum_id = item_id, creator_id=user.id)
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

    # Extract data from request
    content_name = data.get("content_id")
    base_curriculums = data.get("base_curriculums", [])

    if not content_name or not isinstance(base_curriculums, list):
        raise ValueError("Invalid input: 'content_id' must be a string and 'base_curriculums' must be a list.")

    try:
        # Fetch content_id from the Content table
        content_query = Content.query.filter_by(content_id=content_name).first()
        if not content_query:
            raise ValueError(f"Content '{content_name}' not found.")

        content_id = content_query.id

        for curriculum_name in base_curriculums:
            # Fetch curriculum_id from the Curriculum table
            curriculum_query = Curriculum.query.filter_by(curriculum_id=curriculum_name).first()
            
            if not curriculum_query:
                logger.warning(f"Curriculum '{curriculum_name}' not found. Skipping.")
                continue  # Skip missing curriculums instead of failing

            curriculum_id = curriculum_query.id

            # Check for existing assignment to avoid duplicates
            existing_entry = ContentCurriculum.query.filter_by(
                content_id=content_id, curriculum_id=curriculum_id
            ).first()
            if existing_entry:
                logger.info(f"Skipping existing entry: Content ID {content_id}, Curriculum ID {curriculum_id}")
                continue

            # Insert new entry into ContentCurriculum
            new_entry = ContentCurriculum(content_id=content_id, curriculum_id=curriculum_id)
            db.session.add(new_entry)

        # Commit changes to the database
        db.session.commit()
        logger.info("Content assignments successfully updated.")

    except ValueError as ve:
        if logger:
            logger.error(f"Value Error: {ve}")
        raise

    except Exception as e:
        if logger:
            logger.error(f"Unexpected Database Error: {e}")
        db.session.rollback()  # Rollback in case of failure
        raise
        
def update_curriculum_assignments(data, logger=None):
    '''Function to update assignment of tasks to curriculums'''
    
    # Extract the curriculum assignment data
    curriculum_name = data.get('curriculum_id')
    task_list = data.get('task_list', [])
    
    if not curriculum_name or not isinstance(task_list, list):
        raise ValueError("Invalid input: 'curriculum_id' must be a string and 'task_list' must be a list.")

    try:
        
        # Get the Curriculum.id from curriculum_name
        curriculum_query = Curriculum.query.filter_by(curriculum_id=curriculum_name).first()
        if not curriculum_query:
            raise ValueError(f"Curriculum '{curriculum_name}' not found.")
        curriculum_id = curriculum_query.id
        
        for task in task_list:
            # Fetch question_id from the Questions table
            logger.debug("I'm here")
            task_query = Questions.query.filter_by(task_key=task).first()
            
            if not task_query:
                logger.warning(f"Task '{task}' not found. Skipping.")
                continue  # Skip missing questions instead of failing

            question_id = task_query.id

            # Check for existing assignment to avoid duplicates
            existing_entry = CurriculumQuestion.query.filter_by(
                curriculum_id=curriculum_id, question_id=question_id
            ).first()
            if existing_entry:
                logger.info(f"Skipping existing entry: Curriculum ID {curriculum_id}, Question ID {question_id}")
                continue

            # Insert new entry into ContentCurriculum
            new_entry = CurriculumQuestion(curriculum_id=curriculum_id, question_id=question_id)
            db.session.add(new_entry)

        # Commit changes to the database
        db.session.commit()
        logger.info("Curriculum assignments successfully updated.")

    except ValueError as ve:
        if logger:
            logger.error(f"Value Error: {ve}")
        raise

    except Exception as e:
        if logger:
            logger.error(f"Unexpected Database Error: {e}")
        db.session.rollback()  # Rollback in case of failure
        raise
        

def add_new_classroom(class_code, class_description, logger=None):
    '''Function to write new classroom code and description to database'''
    ### No change needed for new schema ###
    
    try:
        # Extract user credentials
        user_id = session.get("user_id")
        role = session.get("role")
        
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