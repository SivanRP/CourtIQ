import json
from supabase import create_client
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

env_variables = {}
with open(".env") as file:
    for line in file:
        key, value = line.strip().split("=",1)
        env_variables[key] = value.strip('"').strip("'")

supabase_url = env_variables["SUPABASE_DATABASE_URL"]
supabase_key = env_variables["SUPABASE_DATABASE_KEY"]

supabase = create_client(supabase_url, supabase_key)

# NEEDS DISCUSSION
def password_for_signup_is_valid(password):
    print()

# NEEDS DISCUSSION
# def username_for_signup_is_valid(username):
#     print()

def username_is_unique(username):
    existing_username = supabase.table("profiles").select("id").eq("username", username).execute()

    return not existing_username

# SIGN UP LOGIC: NEEDS REVIEW
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

    if not username or not first_name or not last_name or not email or not password or not verify_password or not role:
        return JsonResponse({"error": "All fields are required"}, status=400)

    if verify_password != password:
        return JsonResponse({"error": "Passwords don't match"}, status=400)

    if not username_is_unique(password):
        return JsonResponse({"error": "Username is not unique"}, status=400)

    if not password_for_signup_is_valid(password):
        return JsonResponse({"error": "Password is not valid"}, status=400)


    auth_response = supabase.auth.sign_up({
        "email": email,
        "password": password
    })

    user = auth_response.user

    if not user:
        return JsonResponse({"error": auth_response}, status=400)

    insert_response = supabase.table("profiles").insert({
        "id": user.id,
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "role": role
    }).execute()

    if insert_response.status_code != 201 and not insert_response.data:
        return JsonResponse({"error": "Failed to save profile"}, status=400)

    return JsonResponse({"status": "success"})

# LOG IN LOGIC: NEEDS REVIEW
@csrf_exempt
def log_in(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return JsonResponse({"error": "All fields are required"}, status=400)

    profile = supabase.table("profiles").select("email").eq("username", username).execute()

    if not profile:
        return JsonResponse({"error": "Invalid username"}, status=400)

    email = profile.data[0]["email"]

    auth_response = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })

    if not auth_response.session:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    return JsonResponse({"token": auth_response.session.access_token})

@csrf_exempt
def log_out(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user_response = supabase.auth.get_user(token)
    if not user_response or not user_response.user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    supabase.auth.sign_out()

    return JsonResponse({"status": "success"})

MAX_ATHLETES_PER_STAFF = 30

@csrf_exempt
def link_athlete(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user_response = supabase.auth.get_user(token)
    if not user_response or not user_response.user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    staff_id = user_response.user.id

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


@csrf_exempt
def unlink_athlete(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user_response = supabase.auth.get_user(token)
    if not user_response or not user_response.user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    staff_id = user_response.user.id

    data = json.loads(request.body)
    athlete_id = data.get("athlete_id")
    if not athlete_id:
        return JsonResponse({"error": "athlete_id is required"}, status=400)

    supabase.table("staff_athletes").delete().eq("staff_id", staff_id).eq("athlete_id", athlete_id).execute()

    return JsonResponse({"status": "success"})


@csrf_exempt
def get_linked_athletes(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user_response = supabase.auth.get_user(token)
    if not user_response or not user_response.user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    staff_id = user_response.user.id

    links = supabase.table("staff_athletes").select("athlete_id").eq("staff_id", staff_id).execute()
    athlete_ids = [row["athlete_id"] for row in links.data]

    if not athlete_ids:
        return JsonResponse({"athletes": []})

    athletes = supabase.table("profiles").select("*").in_("id", athlete_ids).execute()

    return JsonResponse({"athletes": athletes.data})

# RESET PASSWORD LOGIC: NEEDS REVIEW
@csrf_exempt
def reset_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    email = data.get("email")

    if not email:
        return JsonResponse({"error": "Email required"}, status=400)

    response = supabase.auth.api.reset_password_for_email(email)

    if response.get("error"):
        return JsonResponse({"error": response["error"].message}, status=400)
    else:
        return JsonResponse({"status": "success"})



