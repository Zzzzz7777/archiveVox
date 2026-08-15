from passlib.context import CryptContext
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_PUBLISHABLE_KEY")
)

# Read all users
response = supabase.table("user").select("*").execute()

users = response.data

for user in users:
    password = user["password"]

    # Skip if already hashed
    if password.startswith("$2"):
        continue

    hashed = pwd_context.hash(password)

    supabase.table("user").update(
        {"password": hashed}
    ).eq(
        "user_id", user["user_id"]
    ).execute()

    print(f"Updated {user['username']}")

print("Done!")