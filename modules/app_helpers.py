# Import packages
import json, os, logging
from flask import session, redirect, url_for

# Set up logging
logger = logging.getLogger(__name__)

# Collections of remote file urls
users = "https://raw.githubusercontent.com/montanus-wecib/MPS/refs/heads/main/data/users.json"


def login_required(f):
    """Decorator to check if user is logged in."""
    def decorated_function(*args, **kwargs):
        if 'username' not in session:  # Check if the username is in the session
            return redirect(url_for('index'))  # Redirect if not logged in
        return f(*args, **kwargs)  # Proceed with the original function if logged in
    return decorated_function

class SourceArgError(Exception):
    def __init__(self, badargs):
        Exception.__init__(self, badargs)
        self.badargs = badargs
    def __str__(self):
        return f"SourceArgError: {self.badargs} is not recognized - use '-l' for local or '-r' for remote"


class Question:
    """A question object contains all the data to render a question page in test prep."""

    def __init__(self, question_id):
        self.question_id = question_id
        self.data = None  # Initialize the data attribute
        self.get_question_data()

    def get_question_data(self):
        """Fetch question data from the local JSON file."""
        # Get the absolute path of the JSON file
        base_dir = os.path.dirname(os.path.abspath(__file__))
        fname = os.path.join(base_dir, "..", "data", "content.json")
        try:
            with open(fname, "r") as file:
                self.data = json.load(file)['questions'][self.question_id]
        except FileNotFoundError:
            raise FileNotFoundError("The content.json file could not be found locally.")        

class Curriculum:
    """A question object contains all the data to render a question page in test prep."""

    def __init__(self, curriculum_id):
        self.curriculum_id = curriculum_id
        self.data = None  # Initialize the data attribute
        self.get_curriculum_data()

    def get_curriculum_data(self):
        """Fetch question data from the local JSON file."""
        # Get the absolute path of the JSON file
        base_dir = os.path.dirname(os.path.abspath(__file__))
        fname = os.path.join(base_dir, "..", "data", "curriculum.json")
        try:
            with open(fname, "r") as file:
                self.data = json.load(file)[self.curriculum_id]
        except FileNotFoundError:
            raise FileNotFoundError("The content.json file could not be found locally.")

#---------------------------------------------------------------

if __name__ == "__main__":
    c = Curriculum('pcap1', 'local').data