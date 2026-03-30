import json
from supabase import create_client
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from datetime import *

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

def get_user_from_token(token):
    try:
        response = supabase.auth.get_user(token)
        return response.user if response else None
    except Exception:
        return None

def check_events_overlap(user_id, start_time, end_time):
    new_start = datetime.fromisoformat(start_time)
    new_end = datetime.fromisoformat(end_time)

    existing_events = supabase.table("events").select("start_time,end_time").eq("athlete_id", user_id).in_("status", ["APPROVED", "PENDING"]).execute()

    for event in existing_events.data:
        existing_start = datetime.fromisoformat(event['start_time'])
        existing_end = datetime.fromisoformat(event['end_time'])

        if new_start < existing_end and new_end > existing_start:
            return False

    return True

@csrf_exempt
def create_event(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user_id = user.id
    response = supabase.table("profiles").select("role").eq("id", user_id).execute()

    user_role = response.data[0]["role"]

    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    title = data.get("title")
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    event_type = data.get("event_type")

    # Performing checks of the data provided by the user
    if not title or not start_time or not end_time or not event_type:
        return JsonResponse({"error": "All fields are required"}, status=400)

    if datetime.fromisoformat(start_time) >= datetime.fromisoformat(end_time):
        return JsonResponse({"error": "Invalid time range"}, status=400)

    if not check_events_overlap(user_id, start_time, end_time):
        return JsonResponse({"error": "Time slot is unavailable"}, status=400)

    if user_role == "ATHLETE" and event_type != "PERSONAL":
        insert_response = supabase.table("events").insert({
            "athlete_id": user_id,
            "title": title,
            "start_time": start_time,
            "end_time": end_time,
            "event_type": event_type,
            "status": "APPROVED",
            "visibility": "BLOCKED"
        }).execute()

    if user_role == "COACHING_STAFF" or user_role == "HEAD_COACH":
        insert_response = supabase.table("events").insert({
            "athlete_id": user_id,
            "title": title,
            "start_time": start_time,
            "end_time": end_time,
            "event_type": event_type,
            "status": "PENDING",
            "visibility": "FULL"
        }).execute()

    if not insert_response.data:
        return JsonResponse({"error": "Failed to save event"}, status=400)

    return JsonResponse({"status": "success"})

#NEEDS DISCUSSION
@csrf_exempt
def delete_event(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

#NEEDS DISCUSSION
@csrf_exempt
def edit_event(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

@csrf_exempt
def approve_reject_event_request(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    reject_approve = data.get("reject/approve")
    event_id = data.get("event_id")

    if not reject_approve:
        return JsonResponse({"error": "All fields are required"}, status=400)

    if not event_id:
        return JsonResponse({"error": "Missing information"}, status=400)

    if reject_approve == "REJECT":
        response = supabase.table("events").update({"status": "REJECTED"}).eq("id", event_id).execute()

        return JsonResponse({"status": "success", "action": "REJECT", "event_id": event_id})

    if reject_approve == "APPROVE":
        response = supabase.table("events").update({"status": "APPROVED"}).eq("id", event_id).execute()

        return JsonResponse({"status": "success", "action": "APPROVE", "event_id": event_id})

    return JsonResponse({"error": "Invalid action"}, status=400)

@csrf_exempt
def get_weekly_schedule(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user_id = user.id
    response = supabase.table("profiles").select("role").eq("id", user_id).execute()
    user_role = response.data[0]["role"]

    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    start_of_week = data.get("start_of_week")
    end_of_week = data.get("end_of_week")
    athlete_id = data.get("athlete_id") #field only for HEAD_COACH or COACHING_STAFF

    if user_role == "ATHLETE":
        if not end_of_week or not start_of_week:
            return JsonResponse({"error": "Missing information"}, status=400)

        athlete_id = user_id
        response = supabase.table("events").select("*").eq("athlete_id", athlete_id).in_("status", ["APPROVED", "PENDING"]).gte("end_time", start_of_week).lt("start_time", end_of_week).execute()
    elif (user_role == "HEAD_COACH" or user_role == "COACHING_STAFF"):
        if not athlete_id or not end_of_week or not start_of_week:
            return JsonResponse({"error": "Missing information"}, status=400)

        response = supabase.table("events").select("*").eq("athlete_id", athlete_id).in_("status",["APPROVED", "PENDING"]).gte("end_time", start_of_week).lt("start_time", end_of_week).execute()

    events = response.data

    if not response.data:
        return JsonResponse({"events": []})

    return JsonResponse({"events": events})

@csrf_exempt
def get_rejected_events(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user_id = user.id

    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    athlete_id = data.get("athlete_id") #field only for HEAD_COACH or COACHING_STAFF

    response = supabase.table("events").select("*").eq("athlete_id", athlete_id).eq("status", "REJECTED").execute()
    events = response.data

    if not response.data:
        return JsonResponse({"events": []})

    return JsonResponse({"events": events})