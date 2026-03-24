import json
from supabase import create_client
from supabase_auth.errors import AuthApiError
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

#Parsing the .env file to get the key and the URL of the database
env_variables = {}
with open(".env") as file:
    for line in file:
        key, value = line.strip().split("=",1)
        env_variables[key] = value.strip('"').strip("'")

supabase_url = env_variables["DATABASE_URL"]
supabase_key = env_variables["DATABASE_KEY"]

#Creating a client to access the Supabase database
supabase = create_client(supabase_url, supabase_key)

#Function for retrieving a Supabase user from a given auth token
def get_user_from_token(token):
    try:
        response = supabase.auth.get_user(token)
        return response.user if response else None
    except Exception:
        return None

#Function for checking if the password is following the requirements:
# - 6 characters min
# - At least one upper letter
# - At least one lower letter
# - One of the special characters (.;:,-!?)
def password_for_signup_is_valid(password):
    if len(password) < 6:
        return False

    upper_present = False
    lower_present = False
    digit_present = False
    special_char_present = False

    for char in password:
        if char.isupper():
            upper_present = True
        elif char.islower():
            lower_present = True
        elif char.isdigit():
            digit_present = True
        elif char in ".;:,-!?":
            special_char_present = True

    if upper_present and lower_present and digit_present and special_char_present:
        return True
    else:
        return False

#Method for checking if the username is unique in the database
def username_is_unique(username):
    response = supabase.table("profiles").select("id").eq("username", username).execute()

    return not response.data

#Method for checking if the email is unique in the database
def email_is_unique(email):
    response = supabase.table("profiles").select("id").eq("email", email).execute()

    return not response.data

#Sign Up Logic:
# - Validates input data for the signup
# - Creates a new user in Supabase Auth
# - Inserts additional user information in the profiles table.
@csrf_exempt
def sign_up(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    username = data.get("username")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")
    password = data.get("password")
    verify_password = data.get("verify_password")
    role = data.get("role")

    #Performing checks of the data provided by the user
    if not username or not first_name or not last_name or not email or not password or not verify_password or not role:
        return JsonResponse({"error": "All fields are required"}, status=400)

    if verify_password != password:
        return JsonResponse({"error": "Passwords don't match"}, status=400)

    if not username_is_unique(username):
        return JsonResponse({"error": "Username is not unique"}, status=400)

    if not email_is_unique(email):
        return JsonResponse({"error": "Email is not unique"}, status=400)

    if not password_for_signup_is_valid(password):
        return JsonResponse({"error": "Password is not valid"}, status=400)

    #Performing sign_up with the supabase.auth
    try:
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
    except AuthApiError:
        return JsonResponse({"error": "Failed to create account"}, status=400)

    user = auth_response.user

    #Inserting into the profile table additional information about the user and linking user Supabase table and profiles table with user.id
    insert_response = supabase.table("profiles").insert({
        "id": user.id,
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "role": role,
        "email": email
    }).execute()

    if not insert_response.data:
        return JsonResponse({"error": "Failed to save profile"}, status=400)

    return JsonResponse({"status": "success"})

#Log In Logic:
# - Checks if username exists
# - Retrieves the email from the "profile" table
# - Performs log in with supabase.auth
@csrf_exempt
def log_in(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return JsonResponse({"error": "All fields are required"}, status=400)

    profile = supabase.table("profiles").select("id, email").eq("username", username).execute()

    if not profile.data:
        return JsonResponse({"error": "Invalid username"}, status=400)

    email = profile.data[0]["email"]

    #Try/Except for logging in with supabase.auth
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
    except AuthApiError as e:
        return JsonResponse({"error": str(e)}, status=400)

    #Returning access token for authenticated request
    return JsonResponse({"token": auth_response.session.access_token})

#Log Out Logic:
# - Performs log out with supabase.auth.sign_out()
# - Validates token and user before logout
@csrf_exempt
def log_out(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    supabase.auth.sign_out()

    return JsonResponse({"status": "success"})

MAX_ATHLETES_PER_STAFF = 30

#Link Athlete Logic:
# - Validates the token and the user
# - Checks if the athlete with the athlete id was already linked
# - Checks if the limit for athlete linkage is exceeded
# - Checks if the field with the athlete is filled
# - If all validations are passed, inserts the athlete-staff pair into the "staff_athletes" table
@csrf_exempt
def link_athlete(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    staff_id = user.id

    data = json.loads(request.body)
    athlete_id = data.get("athlete_id")
    if not athlete_id:
        return JsonResponse({"error": "athlete_id is required"}, status=400)

    existing = supabase.table("staff_athletes").select("athlete_id").eq("staff_id", staff_id).execute()

    if len(existing.data) >= MAX_ATHLETES_PER_STAFF:
        return JsonResponse({"error": "Maximum athlete limit reached"}, status=400)

    if any(row["athlete_id"] == athlete_id for row in existing.data):
        return JsonResponse({"error": "Athlete already linked"}, status=400)

    supabase.table("staff_athletes").insert({"staff_id": staff_id, "athlete_id": athlete_id}).execute()

    return JsonResponse({"status": "success"})

#Unlink Athlete Logic:
# - Validates the token and the user
# - Checks if the field with the athlete is filled
# - If all validations are passed, deletes the athlete-staff pair from the "staff_athletes" table
@csrf_exempt
def unlink_athlete(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    staff_id = user.id

    data = json.loads(request.body)
    athlete_id = data.get("athlete_id")
    if not athlete_id:
        return JsonResponse({"error": "athlete_id is required"}, status=400)

    supabase.table("staff_athletes").delete().eq("staff_id", staff_id).eq("athlete_id", athlete_id).execute()

    return JsonResponse({"status": "success"})

# Get Linked Athletes Logic:
# - Retrieves all athletes linked to the authenticated staff
# - Returns list of athlete profiles
@csrf_exempt
def get_linked_athletes(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    staff_id = user.id

    links = supabase.table("staff_athletes").select("athlete_id").eq("staff_id", staff_id).execute()
    athlete_ids = [row["athlete_id"] for row in links.data]

    if not athlete_ids:
        return JsonResponse({"athletes": []})

    athletes = supabase.table("profiles").select("*").in_("id", athlete_ids).execute()

    return JsonResponse({"athletes": athletes.data})

#Reset Password Logic:
# - Resetting password using supabase.auth
# - Sends email to the user for reset
@csrf_exempt
def reset_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    email = data.get("email")

    if not email:
        return JsonResponse({"error": "Email required"}, status=400)

    response = supabase.auth.reset_password_email(email)

    if response.get("error"):
        return JsonResponse({"error": response["error"].message}, status=400)
    else:
        return JsonResponse({"status": "success"})



