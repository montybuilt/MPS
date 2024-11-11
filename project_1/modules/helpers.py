# Import packages
import argparse
import requests

# Dictionary of remote file urls
templates = {
    "testprep": 'https://raw.githubusercontent.com/montanus-wecib/MPS-Application/main/project_1/templates/testprep.html',
    "index": 'https://raw.githubusercontent.com/montanus-wecib/MPS-Application/main/project_1/templates/index.html'
    }

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
        

#---------------------------------------------------------------

if __name__ == "__main__":
    
    try:
        args = Args()
    except:
        print("No source is set, check command line args")
    else:
        print(f"The application is in {args.source} mode")
        
    print(RemoteTemplate("content").fetch())
