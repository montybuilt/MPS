# Import packages
from models import db, User
from data_helpers import CRUDHelper


# Default Dictionaries
CONTENT_SCORES_D = {"pcap": {"Earned": 0, "Possible": 0}, 
                  "pcep": {"Earned": 0, "Possible": 0},
                  "pp1": {"Earned": 0, "Possible": 0},
                  "pp2": {"Earned": 0, "Possible": 0},
                  "intro": {"Earned": 0, "Possible": 0}}

CURRICULUM_SCORES_D = {"intro": {"Earned": 0, "Possible": 0}}


XP_D = {"certifications":{"tutorial": {"xp_1": 0.00},
                        "pcep": {"xp_1": 0.00},
                        "pcap": {"xp_1": 0.00}}}



