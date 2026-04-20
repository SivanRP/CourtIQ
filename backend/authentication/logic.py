import json
import os
from supabase import create_client
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

supabase_url = os.environ.get("SUPABASE_DB_URL", "https://placeholder.supabase.co").strip()
supabase_key = os.environ.get("SUPABASE_KEY", "placeholder-key").strip()

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
        elif char in ".;:,-!?@#$%^&*()_+=":
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
    try:
        return _sign_up(request)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)

def _sign_up(request):
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
    except Exception:
        return JsonResponse({"error": "Failed to create account"}, status=400)

    user = auth_response.user
    if not user:
        return JsonResponse({"error": "Failed to create account"}, status=400)

    try:
        insert_response = supabase.table("profiles").insert({
            "id": user.id,
            "username": username,
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
            "email": email
        }).execute()
    except Exception:
        return JsonResponse({"error": "Failed to save profile"}, status=400)

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

    try:
        profile = supabase.table("profiles").select("id, email").eq("username", username).execute()
    except Exception as e:
        return JsonResponse({"error": f"DB error: {str(e)}"}, status=500)

    if not profile.data:
        return JsonResponse({"error": "Invalid username"}, status=400)

    email = profile.data[0]["email"]

    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

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


@csrf_exempt
def get_profile(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    profile = supabase.table("profiles").select("*").eq("id", user.id).execute()

    if not profile.data:
        return JsonResponse({"error": "Profile not found"}, status=404)

    return JsonResponse({"profile": profile.data[0]})


#Link Athlete-Staff Logic: (SC)
# - Validates the token and the user
# - Determines if the user is staff or athlete based on the role in the "profiles" table
# - Retrieves the athlete or staff id based on the username provided in the request body
# - Validates that the athlete or staff exists
# - Validates that the athlete-staff pair is not already linked# - Validates that the staff member has not exceeded the limit of linked athletes
# - Validates that the athlete and staff fields are filled in the request body
# - If all validations are passed, inserts the relationship into the "staff_athletes" table
@csrf_exempt
def link_users(request):
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
    username = data.get("username")

    if not username:
        return JsonResponse({"error": "Username required"}, status=400)
    
    profile = supabase.table("profiles").select("role").eq("id", user.id).execute()
    role = profile.data[0]["role"]

    if role in ["HEAD_COACH", "COACHING_STAFF"]:
        staff_id = user.id

        athlete = supabase.table("profiles").select("id").eq("username", username).execute()

        if not athlete.data:
            return JsonResponse({"error": "Athlete not found"}, status=404)

        athlete_id = athlete.data[0]["id"]

    elif role == "ATHLETE":
        athlete_id = user.id

        staff = supabase.table("profiles").select("id").eq("username", username).execute()

        if not staff.data:
            return JsonResponse({"error": "Staff not found"}, status=404)

        staff_id = staff.data[0]["id"]

    else:
        return JsonResponse({"error": "Invalid role"}, status=400)
    
    existing = supabase.table("staff_athletes").select("id").eq("staff_id", staff_id).eq("athlete_id", athlete_id).execute()

    if existing.data:
        return JsonResponse({"error": "Athlete already linked"}, status=400)

    all_links = supabase.table("staff_athletes").select("athlete_id").eq("staff_id", staff_id).execute()
    
    if len(all_links.data) >= MAX_ATHLETES_PER_STAFF:
        return JsonResponse({"error": "Maximum athlete limit reached"}, status=400)
    
    supabase.table("staff_athletes").insert({"staff_id": staff_id, "athlete_id": athlete_id}).execute()

    return JsonResponse({"status": "success"})

#Unlink Athlete Logic:
# - Validates the token and the user
# - Checks role to determine which side of the relationship to remove
# - Staff provide athlete_id, athletes provide staff_id
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

    data = json.loads(request.body)
    profile = supabase.table("profiles").select("role").eq("id", user.id).execute()
    role = profile.data[0]["role"]

    if role in ["HEAD_COACH", "COACHING_STAFF"]:
        athlete_id = data.get("athlete_id")
        if not athlete_id:
            return JsonResponse({"error": "athlete_id is required"}, status=400)
        supabase.table("staff_athletes").delete().eq("staff_id", user.id).eq("athlete_id", athlete_id).execute()

    elif role == "ATHLETE":
        staff_id = data.get("staff_id")
        if not staff_id:
            return JsonResponse({"error": "staff_id is required"}, status=400)
        supabase.table("staff_athletes").delete().eq("staff_id", staff_id).eq("athlete_id", user.id).execute()

    else:
        return JsonResponse({"error": "Invalid role"}, status=400)

    return JsonResponse({"status": "success"})

# Get Linked Logic:
# - Retrieves all users linked to the authenticated staff or athlete
# - Returns list of athlete profiles for a staff member or list of staff profiles for an athlete
@csrf_exempt
def get_linked(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    profile = supabase.table("profiles").select("role").eq("id", user.id).execute()
    role = profile.data[0]["role"]

    if role in ["HEAD_COACH", "COACHING_STAFF"]:
        links = supabase.table("staff_athletes").select("athlete_id").eq("staff_id", user.id).execute()

        athlete_ids = [row["athlete_id"] for row in links.data]

        if not athlete_ids:
            return JsonResponse({"athletes": []})

        athletes = supabase.table("profiles").select("*").in_("id", athlete_ids).execute()

        return JsonResponse({"athletes": athletes.data})
    
    elif role == "ATHLETE":
        links = supabase.table("staff_athletes").select("staff_id").eq("athlete_id", user.id).execute()

        staff_ids = [row["staff_id"] for row in links.data]

        if not staff_ids:
            return JsonResponse({"staff": []})  # reuse same key

        staff = supabase.table("profiles").select("*").in_("id", staff_ids).execute()

        return JsonResponse({"staff": staff.data})

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

    try:
        supabase.auth.reset_password_email(email)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"status": "success"})

#Update Password Logic:
# - Validates the recovery token sent from the reset email
# - Validates the new password meets requirements
# - Updates the user's password in Supabase Auth
@csrf_exempt
def update_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return JsonResponse({"error": "All fields are required"}, status=400)

    if not password_for_signup_is_valid(new_password):
        return JsonResponse({"error": "Password does not meet requirements"}, status=400)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Invalid or expired token"}, status=401)

    try:
        supabase.auth.update_user({"password": new_password})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"status": "success"})



