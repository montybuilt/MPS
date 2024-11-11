# Import packages
import argparse
import requests
import json
import os
from flask import session, redirect, url_for

# Dictionary of remote file urls
templates = {
    "testprep": 'https://raw.githubusercontent.com/montanus-wecib/MPS-Application/main/project_1/templates/testprep.html',
    "index": 'https://raw.githubusercontent.com/montanus-wecib/MPS-Application/main/project_1/templates/index.html'
    }

def verify2(username, password):
    """Verify username and password against the remote JSON file."""
    url = "https://raw.githubusercontent.com/montanus-wecib/MPS-Application/main/project_1/data/users.json"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        data = response.json()
        
        if username in data:
            return password == data[username]  # Compare encrypted passwords
        return False  # Username does not exist

    except (requests.RequestException, ValueError) as e:
        # Handle network or JSON errors
        print(f"Error fetching or processing the user data: {e}")
        return False

def verify(username, password):
    """Verify username and password against the local JSON file."""
    file_path = os.path.join(os.path.dirname(__file__), '../data/users.json')
    
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)

        if username in data:
            return password == data[username]  # Compare encrypted passwords
        return False  # Username does not exist

    except (FileNotFoundError, ValueError) as e:
        # Handle file not found or JSON errors
        print(f"Error fetching or processing the user data: {e}")
        return False

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

class Args:
    def __init__(self):
        # Set up the argument parser
        parser = argparse.ArgumentParser(description="Run app with local or remote files.")
        parser.add_argument('-l', '--local', action='store_true', help='Use local files')
        parser.add_argument('-r', '--remote', action='store_true', help='Use remote files')
        args, unknown = parser.parse_known_args()
        #Test the argument and handle any error
        try:
            if not args.local and not args.remote:
                raise SourceArgError(", ".join(unknown))
        except SourceArgError as se:
            print(se)
            raise
        else:
            self.source = 'local' if args.local else ('remote' if args.remote else 'local')
    # Create a string method for the parse object
    def __str__(self):
        return f"The document source is set to {self.source}"

class RemoteTemplate:
    def __init__(self, template):
        # get the correct template
        self.url = templates[template]
        self.text = self.fetch()
        
    def fetch(self):
        # Method to return the text of the template or a 404 error message if url not valid
        if self.url:
            response = requests.get(self.url)
            if response.status_code == 200:
                return response.text  # Return the HTML content directly
            else:
                return "Error retrieving content.", 404

class Question:
    """A question object contains all the data to render a question page in test prep."""

    def __init__(self, question_id, mode):
        self.question_id = question_id
        self.mode = mode
        self.data = None  # Initialize the data attribute

        # Attempt to get data based on the mode
        if mode == 'remote':
            try:
                self.get_remote_data()
            except requests.exceptions.RequestException as e:
                print(f"Error fetching remote data: {e}")
                self.get_local_data()  # Fallback to local data
        else:
            self.get_local_data()

    def get_local_data(self):
        """Fetch question data from the local JSON file."""
        # Get the absolute path of the JSON file
        base_dir = os.path.dirname(os.path.abspath(__file__))
        fname = os.path.join(base_dir, "..", "data", "content.json")
        try:
            with open(fname, "r") as file:
                self.data = json.load(file)['questions'][self.question_id]
        except FileNotFoundError:
            raise FileNotFoundError("The content.json file could not be found locally.")

    def get_remote_data(self):
        """Fetch question data from the remote JSON URL."""
        url = "https://raw.githubusercontent.com/montanus-wecib/MPS-Application/main/project_1/data/content.json"
        response = requests.get(url)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        self.data = response.json()['questions'][self.question_id]
        

class Curriculum:
    """A question object contains all the data to render a question page in test prep."""

    def __init__(self, curriculum_id, mode):
        self.curriculum_id = curriculum_id
        self.mode = mode
        self.data = None  # Initialize the data attribute

        # Attempt to get data based on the mode
        if mode == 'remote':
            try:
                self.get_remote_data()
            except requests.exceptions.RequestException as e:
                print(f"Error fetching remote data: {e}")
                self.get_local_data()  # Fallback to local data
        else:
            self.get_local_data()

    def get_local_data(self):
        """Fetch question data from the local JSON file."""
        # Get the absolute path of the JSON file
        base_dir = os.path.dirname(os.path.abspath(__file__))
        fname = os.path.join(base_dir, "..", "data", "curriculum.json")
        try:
            with open(fname, "r") as file:
                self.data = json.load(file)[self.curriculum_id]
        except FileNotFoundError:
            raise FileNotFoundError("The content.json file could not be found locally.")

    def get_remote_data(self):
        """Fetch question data from the remote JSON URL."""
        url = "https://raw.githubusercontent.com/montanus-wecib/MPS-Application/main/project_1/data/content.json"
        response = requests.get(url)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        self.data = response.json()[self.curriculum_id]

#---------------------------------------------------------------

if __name__ == "__main__":
    c = Curriculum('pcap1', 'local').data