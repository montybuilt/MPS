# Import packages
import bcrypt
from modules.models import User


def verify(username, password):
    """Verify username and password"""
    try:
        user = User.query.filter_by(username=username).first()

        if user is None:
            return "Username not found"  # Return a user-friendly message

        # Check if the password matches
        if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            return True  # Return True if the password matches

        return "Invalid password"  # Return a message for invalid password

    except Exception as e:
        return f"Error verifying user: {e}"  # General error message