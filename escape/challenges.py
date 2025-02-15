# Define the challenges and expected outputs

CHALLENGES = {
    "1": {
        "background": "images/cyborg/img1.webp",
        "title": "Turn the Tide",
        "prompt": "Write a function `reverse(string)` that takes a string as an argument.  It will return the reverse of the string - LETTERS ONLY!.",
        "response": "That works!  I will import this into our encryption module!  Stand by for orders!!",
        "test_code": """
import unittest
from student_code import reverse

class TestChallenge(unittest.TestCase):
    def test_reverse(self):
        self.assertEqual(reverse('!BICEW ot emocleW'), 'WelcometoWECIB')
        self.assertEqual(reverse('123Testing'), 'gnitseT')
"""
    },
    
    "11": {
        "background": "images/cyborg/img3.webp",
        "title": "Analyzing Their LMMs",
        "prompt": "Write a function `char_counter(string)` that takes a string parameter and counts character occurrences (excluding spaces) - it returns a dictionary with the characters as keys and the counts as values.",
        "response": "Great! We can use this to identify which LLMs they are deploying!  Maybe we can use this!",
        "test_code": """
import unittest
from student_code import char_counter

class TestChallenge(unittest.TestCase):
    def test_frequency(self):
        self.assertEqual(char_counter('banana'), {'b': 1, 'a': 3, 'n': 2})
        self.assertEqual(char_counter('apple pie'), {'a': 1, 'p': 3, 'l': 1, 'e': 2, 'i': 1})
        self.assertEqual(char_counter('hello'), {'h': 1, 'e': 1, 'l': 2, 'o': 1})
"""
    },
        
    "10": {
        "background": "images/cyborg/img2.webp",
        "title": "Cyborg Cipher",
        "prompt": "It seems like they may be using a crude cipher in some comms - they are sending hex codes where each two bytes is separated by a '/' (e.g., '14/c1/3f'). We think these codes are ascii code points shifted.  Define a function called 'shift(string)' that will take one of these strings, split it, shift the ord value of each character by 22 and return the result as a string.",
        "response": "Thanks!  We have a team underground in Canada that can use this.  Stay on comms!",
        "test_code": """
import unittest
from student_code import shift

class TestChallenge(unittest.TestCase):
    def test_identifiers(self):
        self.assertEqual(shift('21/28/39/2f'), '7>OE')
        self.assertEqual(shift('f/2b/1c/32'), '%A2H')
"""
    },
    
    "2": {
        "background": "images/cyborg/img2.webp",
        "title": "To Be Or Not To Be - That is the Exception!",
        "prompt": "Write a function `safe_int(string)` that casts a string to an integer and returns it if it can. If not it will return 'Invalid input'.",
        "response": "Excellent!  It's going to take all of us to win this war!",
        "test_code": """
import unittest
from student_code import safe_int

class TestChallenge(unittest.TestCase):
    def test_safe_int(self):
        self.assertEqual(safe_int('42'), 42)
        self.assertEqual(safe_int('3.14'), 'Invalid input')
        self.assertEqual(safe_int('hello'), 'Invalid input')
"""
    },
    
    "3": {
        "background": "images/cyborg/img3.webp",
        "title": "Custom Assertion Checker",
        "prompt": "Write a function `check_pos(number)` that asserts the input is a positive number. If it is it will return 'Valid', otherwise it raises an AssertionError.",
        "response": "That works!  This function will be critical in the battle!  Keep fighting!!",
        "test_code": """
import unittest
from student_code import check_pos

class TestChallenge(unittest.TestCase):
    def test_check_pos(self):
        self.assertEqual(check_pos(10), 'Valid')
        with self.assertRaises(AssertionError):
            check_pos(-5)
        with self.assertRaises(AssertionError):
            check_pos(0)
        with self.assertRaises(AssertionError):
            check_pos('33')
"""
    },
        
    "4": {
        "background": "images/cyborg/img4.webp",
        "title": "Infiltrating the AI Database",
        "prompt": "We have figured out methods to hack into their databases.  But we need a Name validator - define a function called name_validator(string) that checks to see if the string is a name.  It return True if the name starts with a capital letter, contains only letters or spaces, and is at least 3 characters long.  If not it raises a ValueError with message 'Invalid name format'.",
        "response": "Yes!  Now we can monitor their database traffic.  Stand by for more!",
        "test_code": """
import unittest
from student_code import name_validator

class TestChallenge(unittest.TestCase):
    def test_valid_names(self):
        self.assertTrue(name_validator("Sarah Connor"))
        self.assertTrue(name_validator("John Doe"))

    def test_invalid_names(self):
        for name in ["t800", "X", "john doe", "123"]:
            with self.assertRaises(ValueError) as context:
                name_validator(name)
            self.assertEqual(str(context.exception), "Invalid name format")
"""
    },
    
    "15": {
        "background": "images/cyborg/img7.webp",
        "title": "Bifurcation Station",
        "prompt": "We may have noticed a pattern in their comms.  Write a function that takes a string called bifurcate(string). It will decompose the string into two groups: Characters whose code point is greater than or equal to the mean of the string’s character code points go to the high group. Characters below the mean go to the low group.  Then convert the code points into binary strings and recombine the two strings with the lower code point characters at the front and the higher at the back.  Each binary string will be prefixed with '0b'. Remove all spaces.",
        "response": "Wow, that was a tough one.  Nice work!  We can win this war!!",
        "test_code": """
import unittest
from student_code import bifurcate

class TestChallenge(unittest.TestCase):
    def test_bifurcate_int(self):
        self.assertEqual(bifurcate("tom"), "0b11011110b11011010b1110100")
        self.assertEqual(bifurcate("Big15"), '0b10000100b1100010b1101010b11010010b1100111')
"""
    },
    
    "6": {
        "background": "images/cyborg/img6.webp",
        "title": "It Ends With Us",
        "prompt": "Help us with this string validation task.  Define a function 'validate_string(string)' that takes a string parameter - if this string ends with a digit between 3 and 7 inclusive, return 'Valid', otherwise return 'Invalid'.  We need this ASAP!",
        "response": "It's working.  Thank god we have you on our side...",
        "test_code": """
import unittest
from student_code import validate_string

class TestChallenge(unittest.TestCase):
    def test_validate_string(self):
        self.assertEqual(validate_string("mission_code_3"), "Valid")
        self.assertEqual(validate_string("alpha77"), "Valid")
        self.assertEqual(validate_string("secure_5"), "Valid")
        self.assertEqual(validate_string("data_x9"), "Invalid")
        self.assertEqual(validate_string("hello_world"), "Invalid")
        self.assertEqual(validate_string("operation_2"), "Invalid")
        self.assertEqual(validate_string("decode7"), "Valid")
        self.assertEqual(validate_string("decode8"), "Invalid")
"""
    },
        
    "8": {
        "background": "images/cyborg/img8.webp",
        "title": "Bookending the Beasts",
        "prompt": "Define a function called 'upend(string)' that takes a string parameter.  It will return the same string but it will change the end character to the opposite case and will offset it by +1 code point.  We need this ASAP!  Their central processing can't detect our short simple functions!",
        "response": "Right on, we keep writing code to infiltrate and defeat their systems, LETS GO!",
        "test_code": """
import unittest
from student_code import upend

class TestChallenge(unittest.TestCase):
    def test_upend(self):
        self.assertEqual(upend("hello"), "hellP")
        self.assertEqual(upend("WORLD"), "WORLe")
        self.assertEqual(upend("Mission"), "MissioO")
        self.assertEqual(upend("cyberX"), "cybery")
"""
    },
        
    "7": {
        "background": "images/cyborg/img7.webp",
        "title": "War of Exceptions",
        "prompt": "Define a function called 'id_error(string)' that takes a string parameter.  It will raise a ValueError with the custom message 'Forbidden' if any of the characters have a code point value above 255",
        "response": "Right on, we keep writing code to infiltrate and defeat their systems, LETS GO!",
        "test_code": """
import unittest
from student_code import id_error

class TestChallenge(unittest.TestCase):
    def test_valid_string(self):
        try:
            id_error("Valid123")
        except ValueError:
            self.fail("id_error() raised ValueError unexpectedly!")

    def test_invalid_string(self):
        with self.assertRaises(ValueError) as context:
            id_error("Hello✓")  # Contains a Unicode character (> 255)
        self.assertEqual(str(context.exception), "Forbidden")

    def test_invalid_string_cyrillic(self):
        with self.assertRaises(ValueError) as context:
            id_error("Привет")  # Cyrillic letters (> 255)
        self.assertEqual(str(context.exception), "Forbidden")

"""
    },
        
    "9": {
        "background": "images/cyborg/img1.webp",
        "title": "Scrambled Transmission",
        "prompt": "The enemy is disguising their transmissions by scrambling letters. Define a function unscramble(message) that takes a scrambled string where every even index character is shifted forward by +2 in the ASCII table and every odd index character is shifted back by -1. Return the decoded message.",
        "response": "Nice! We can read their messages now and anticipate their moves!",
        "test_code": """
import unittest
from student_code import unscramble

class TestChallenge(unittest.TestCase):
    def test_unscramble(self):
        self.assertEqual(unscramble("ccccc"), "adada")
        self.assertEqual(unscramble("57575"), "38383")

"""
    },
        
    "5": {
        "background": "images/cyborg/img5.webp",
        "title": "The Fix is In",
        "prompt": "Our stolen data files are corrupted! Some words have numbers mixed in. Define a function restore_data(string) that removes all numbers from a given string and capitalizes the first letter of every word.",
        "response": "Perfect! Now our analysts can read the stolen reports!",
        "test_code": """
import unittest
from student_code import restore_data

class TestChallenge(unittest.TestCase):
    def test_restore_data(self):
        self.assertEqual(restore_data("th3 5cyb0rgs 4re h3re!"), "Th Cybrgs Re Hre!")
        self.assertEqual(restore_data("7enemy 2b0ts 9detected"), "Enemy Bts Detected")

"""
    },
        
    "13": {
        "background": "images/cyborg/img5.webp",
        "title": "Encrypted Commands",
        "prompt": "The enemy is encoding their secret commands using an offset cipher. Write a function 'decrypt_command(string, shift)' that takes a string and shifts the code point of every letter by 'shift' places in the alphabet while keeping non-letters unchanged.",
        "response": "Boom! We intercepted their latest attack plans!",
        "test_code": """
import unittest
from student_code import decrypt_command

class TestChallenge(unittest.TestCase):
    def test_decrypt_command(self):
        self.assertEqual(decrypt_command("Gdkkn vnqkc!", 1), "Hello world!")
        self.assertEqual(decrypt_command("Uifsf jt b tfdsfu dpnf!", -1), "There is a secret come!")

"""
    },
        
    "14": {
        "background": "images/cyborg/img6.webp",
        "title": "Enemy Signature Detection",
        "prompt": "We suspect that enemy cyborgs are marking their messages with hidden signatures. Define a function detect_signature(string, signature) that checks if the string contains the signature, ignoring case sensitivity and extra spaces. It should return True if found, otherwise False.",
        "response": "Now we can identify all enemy transmissions! Keep going!",
        "test_code": """
import unittest
from student_code import detect_signature

class TestChallenge(unittest.TestCase):
    def test_detect_signature(self):
        self.assertTrue(detect_signature("The attack begins at dawn", "attack"))
        self.assertFalse(detect_signature("Meet at the safehouse", "cyborg"))
"""
    },
        
    "12": {
        "background": "images/cyborg/img4.webp",
        "title": "Error Detection Algorithm",
        "prompt": "Our software needs a robust error handling system. Define a function validate_code(string) that checks if a string contains only alphanumeric characters - return 'Valid' if that is the case. If it contains anything else, raise a ValueError('Corrupted Code').",
        "response": "Critical! Now we can filter out fake commands from the cyborgs!",
        "test_code": """
import unittest
from student_code import validate_code

class TestChallenge(unittest.TestCase):
    def test_validate_code(self):
        self.assertEqual(validate_code("Mission123"), "Valid")
        with self.assertRaises(ValueError) as context:
            validate_code("Alert!@#")
        self.assertEqual(str(context.exception), "Corrupted Code")

"""
    }
}

if __name__ == '__main__':
    
    keys = sorted([int(key) for key in CHALLENGES])
    keys = [str(key) for key in keys]
    print(keys)
    out = {key: CHALLENGES[key] for key in keys}
