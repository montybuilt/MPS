import os
from math import isclose
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from modules.models import XP, Questions
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# ---- Determine environment ----
env = os.getenv("FLASK_ENV", "development")

if env == "production":
    db_url = os.getenv("DATABASE_URL")
else:
    db_url = "sqlite:///instance/db.sqlite"

# ---- Set up engine and session ----
engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)

DRY_RUN = False
TEST_USER_ID = None

# ---- Mismatch checker and updater function ----
def find_and_update_xp_discrepancies(session: Session):
    xp_records = session.query(XP).all()
    updated_count = 0
    skipped_count = 0

    for xp in xp_records:
        if TEST_USER_ID is not None and xp.user_id != TEST_USER_ID:
            continue

        question = session.query(Questions).filter_by(task_key=xp.question_id).first()

        if question is None:
            print(f"Question not found for XP ID {xp.id} (question_id: {xp.question_id})")
            continue

        old_difficulty = xp.difficulty
        new_difficulty = question.difficulty

        if isclose(old_difficulty, new_difficulty, rel_tol=1e-6):
            continue  # No update needed

        xp_value = xp.dXP
        case = None

        if isclose(xp_value, old_difficulty / 3, rel_tol=1e-6) and xp_value != 0:
            case = "first_correct"
            xp.dXP = new_difficulty / 3
            xp.possible_xp = new_difficulty / 3
        
        elif isclose(xp_value, 0.5 * (old_difficulty / 3), rel_tol=1e-6) and xp_value != 0:
            case = "second_correct"
            xp.dXP = 0.5 * (new_difficulty / 3)
            xp.possible_xp = new_difficulty / 3
        
        elif isclose(xp_value, 0.01 * (old_difficulty / 3), rel_tol=1e-6) and xp_value != 0:
            case = "repeat_correct"
            xp.dXP = 0.01 * (new_difficulty / 3)
            xp.possible_xp = new_difficulty / 3
        
        elif isclose(xp_value, (old_difficulty - 3) / 3, rel_tol=1e-6) and xp_value != 0:
            case = "first_incorrect"
            xp.dXP = (new_difficulty - 3) / 3
            xp.possible_xp = new_difficulty / 3
        
        elif isclose(xp_value, 0.0, abs_tol=1e-8) and isclose(xp.possible_xp, 0.0, abs_tol=1e-8):
            case = "timeout_correct"
            xp.difficulty = new_difficulty

        else:
            print(f"[Skipped] {xp.id}: dXP = {xp_value}, old_difficulty = {old_difficulty}")
            skipped_count += 1
            continue

        # Apply updates
        xp.difficulty = new_difficulty
        updated_count += 1

        if DRY_RUN:
            print(f"[Dry Run] Would update XP ID {xp.id} (case: {case})")

    if DRY_RUN:
        print("[Dry Run] Changes not committed.")
        session.rollback()
    else:
        session.commit()
        print(f"Committed updates to database.")

    print(f"Updated {updated_count} XP records.")
    print(f"Skipped {skipped_count} records.")

# ---- Script Entry Point ----
if __name__ == "__main__":
    session = SessionLocal()
    try:
        find_and_update_xp_discrepancies(session)
    finally:
        session.close()
