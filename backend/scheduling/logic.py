import json
import os
from supabase import create_client
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from datetime import datetime, timedelta

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

#Method to check events overlap
# - Accesses "events" table from the Supabase
# - Checks if start and end time of the new event doesn't overlap with the existing event
def check_events_overlap(user_id, start_time, end_time):
    new_start = datetime.fromisoformat(start_time)
    new_end = datetime.fromisoformat(end_time)

    existing_events = supabase.table("events").select("start_time,end_time").eq("athlete_id", user_id).in_("status", ["CONFIRMED", "PENDING"]).execute()

    for event in existing_events.data:
        existing_start = datetime.fromisoformat(event['start_time'])
        existing_end = datetime.fromisoformat(event['end_time'])

        if new_start < existing_end and new_end > existing_start:
            return False

    return True

#Method to create event in the Supabase table "events"
# - Creates event in the Supabase table "events"
# - Check the roles in order to assign status [CONFIRMED, PENDING]
# - Gets the data from the frontend using "POST" request
# - Calls helper function check_events_overlap(user_id, start_time, end_time)
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

    #Performing checks of the data provided by the user
    if not title or not start_time or not end_time or not event_type:
        return JsonResponse({"error": "All fields are required"}, status=400)

    if datetime.fromisoformat(start_time) >= datetime.fromisoformat(end_time):
        return JsonResponse({"error": "Invalid time range"}, status=400)

    if not check_events_overlap(user_id, start_time, end_time):
        return JsonResponse({"error": "Time slot is unavailable"}, status=400)

    if user_role == "ATHLETE":
        insert_response = supabase.table("events").insert({
            "athlete_id": user_id,
            "title": title,
            "start_time": start_time,
            "end_time": end_time,
            "event_type": event_type,
            "status": "CONFIRMED",
            "visibility": "BLOCKED" if event_type == "PERSONAL" else "FULL"
        }).execute()

    elif user_role in ["COACHING_STAFF", "HEAD_COACH"]:
        athlete_id = data.get("athlete_id")
        if not athlete_id:
            return JsonResponse({"error": "athlete_id is required"}, status=400)

        link = supabase.table("staff_athletes").select("id").eq("staff_id", user_id).eq("athlete_id", athlete_id).execute()
        if not link.data:
            return JsonResponse({"error": "Not linked to this athlete"}, status=403)

        if not check_events_overlap(athlete_id, start_time, end_time):
            return JsonResponse({"error": "Time slot is unavailable for this athlete"}, status=400)

        # Head coaches add events directly (confirmed); coaching staff submit requests (pending)
        status = "CONFIRMED" if (user_role == "HEAD_COACH" and event_type == "MATCH") else "PENDING"

        insert_response = supabase.table("events").insert({
            "athlete_id": athlete_id,
            "title": title,
            "start_time": start_time,
            "end_time": end_time,
            "event_type": event_type,
            "status": status,
            "visibility": "FULL"
        }).execute()

    else:
        return JsonResponse({"error": "Invalid role"}, status=400)

    if not insert_response.data:
        return JsonResponse({"error": "Failed to save event"}, status=400)

    return JsonResponse({"status": "success"})

#Method to delete event in the Supabase table "events"
# - Gets the data from the frontend using "POST" request
# - Performs role checking and deletes the event associated with event_id
# - Performs checks, such as checking if there is an event
@csrf_exempt
def delete_event(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user_id = user.id
    profile = supabase.table("profiles").select("role").eq("id", user_id).execute()
    user_role = profile.data[0]["role"]

    data = json.loads(request.body)
    event_id = data.get("event_id")
    if not event_id:
        return JsonResponse({"error": "event_id is required"}, status=400)

    event = supabase.table("events").select("*").eq("id", event_id).execute()
    if not event.data:
        return JsonResponse({"error": "Event not found"}, status=404)

    event_data = event.data[0]

    # Athletes can only delete their own events
    if user_role == "ATHLETE":
        if event_data["athlete_id"] != user_id:
            return JsonResponse({"error": "Forbidden"}, status=403)

    # Head coaches can delete events for their linked athletes
    elif user_role == "HEAD_COACH":
        link = supabase.table("staff_athletes").select("id").eq("staff_id", user_id).eq("athlete_id", event_data["athlete_id"]).execute()
        if not link.data:
            return JsonResponse({"error": "Not linked to this athlete"}, status=403)

    else:
        return JsonResponse({"error": "Forbidden"}, status=403)

    supabase.table("events").delete().eq("id", event_id).execute()
    return JsonResponse({"status": "success"})

#Method to edit event in the Supabase table "events"
# - Gets the data from the user to change the event (time, type, title)
# - Updates the event entry in table in the database with the new data
# - Performs checks, such as checking if there is an event
@csrf_exempt
def edit_event(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user_id = user.id
    profile = supabase.table("profiles").select("role").eq("id", user_id).execute()
    user_role = profile.data[0]["role"]

    data = json.loads(request.body)
    event_id = data.get("event_id")
    if not event_id:
        return JsonResponse({"error": "event_id is required"}, status=400)

    event = supabase.table("events").select("*").eq("id", event_id).execute()
    if not event.data:
        return JsonResponse({"error": "Event not found"}, status=404)

    event_data = event.data[0]

    # Athletes can only edit their own events
    if user_role == "ATHLETE":
        if event_data["athlete_id"] != user_id:
            return JsonResponse({"error": "Forbidden"}, status=403)

    # Head coaches can edit events for their linked athletes
    elif user_role == "HEAD_COACH":
        link = supabase.table("staff_athletes").select("id").eq("staff_id", user_id).eq("athlete_id", event_data["athlete_id"]).execute()
        if not link.data:
            return JsonResponse({"error": "Not linked to this athlete"}, status=403)

    else:
        return JsonResponse({"error": "Forbidden"}, status=403)

    title = data.get("title", event_data["title"])
    start_time = data.get("start_time", event_data["start_time"])
    end_time = data.get("end_time", event_data["end_time"])
    event_type = data.get("event_type", event_data["event_type"])

    if datetime.fromisoformat(start_time) >= datetime.fromisoformat(end_time):
        return JsonResponse({"error": "Invalid time range"}, status=400)

    #Updating the event with the new data
    supabase.table("events").update({
        "title": title,
        "start_time": start_time,
        "end_time": end_time,
        "event_type": event_type,
        "visibility": "BLOCKED" if event_type == "PERSONAL" else "FULL"
    }).eq("id", event_id).execute()

    return JsonResponse({"status": "success"})

#Method for approving and rejecting events
# - Performs checks of the data
# - If event is rejected, delete it from the database
# -  #If event is approved, update its status to "CONFIRMED"
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

    #If event is rejected, delete it from the database
    if reject_approve == "REJECT":
        supabase.table("events").delete().eq("id", event_id).execute()

        return JsonResponse({"status": "success", "action": "REJECT", "event_id": event_id})

    #If event is approved, update its status to "CONFIRMED"
    if reject_approve == "APPROVE":
        response = supabase.table("events").update({"status": "CONFIRMED"}).eq("id", event_id).execute()

        return JsonResponse({"status": "success", "action": "APPROVE", "event_id": event_id})

    return JsonResponse({"error": "Invalid action"}, status=400)

#Method for getting the weekly schedule
# - Get the weekly schedule for the specified week
# - Extracts the user token to access current user's id
# - Gets the athlete id for coaching staff or head coach only
# - Returns events for the specified week based either on user's id for athlete or based on athlete's for coaching staff or caoch
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

    #If the user is athlete, get the schedule for the athlete
    if user_role == "ATHLETE":
        if not end_of_week or not start_of_week:
            return JsonResponse({"error": "Missing information"}, status=400)

        athlete_id = user_id
        response = supabase.table("events").select("*").eq("athlete_id", athlete_id).in_("status", ["CONFIRMED", "PENDING"]).gte("end_time", start_of_week).lt("start_time", end_of_week).execute()

    # If the user is a head coach or coaching staff, get the schedule for the athlete specified with the user_id
    elif (user_role == "HEAD_COACH" or user_role == "COACHING_STAFF"):
        if not athlete_id or not end_of_week or not start_of_week:
            return JsonResponse({"error": "Missing information"}, status=400)

        response = supabase.table("events").select("*").eq("athlete_id", athlete_id).in_("status",["CONFIRMED", "PENDING"]).gte("end_time", start_of_week).lt("start_time", end_of_week).execute()

    events = response.data

    if not response.data:
        return JsonResponse({"events": []})

    return JsonResponse({"events": events})

#Method for getting the rejected events
# - Returns the list of rejected events for the user
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

    return JsonResponse({"events": []})

#Method for getting the statistics
# - Retrieves activity logs and match statistics for a week or a month
# - Extracts the user token to access current user's id
# - Athletes can only access their own data
# - Coaching staff and head coaches can specify an athlete ID
# - Filters data based on the selected time period
# - Returns activity logs and match statistics within the specified period
@csrf_exempt
def get_statistics(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    period = request.GET.get("period", "week")
    athlete_id = request.GET.get("athlete_id", user.id)

    profile = supabase.table("profiles").select("role").eq("id", user.id).execute()
    role = profile.data[0]["role"]

    #Checking if the user is ATHLETE
    if role == "ATHLETE":
        athlete_id = user.id

    now = datetime.utcnow()

    #Specifying the period of time
    if period == "week":
        start_date = (now - timedelta(days=7)).isoformat()
    elif period == "month":
        start_date = (now - timedelta(days=30)).isoformat()
    else:
        return JsonResponse({"error": "Invalid period. Use 'week' or 'month'"}, status=400)

    #Selecting the data from activity_logs table
    logs = supabase.table("activity_logs").select("*").eq(
        "athlete_id", athlete_id
    ).gte("date", start_date).execute()

    #Selecting the data from match_statistics table
    match_stats = supabase.table("match_statistics").select("*").eq(
        "athlete_id", athlete_id
    ).gte("match_date", start_date).execute()

    return JsonResponse({
        "period": period,
        "activity_logs": logs.data,
        "match_statistics": match_stats.data
    })

#Method for getting the weekly summary
# - Extracts the user token to access current user's id
# - Athletes can only access their own data
# - Coaching staff and head coaches can specify an athlete ID
# - Requires start and end dates for the week
# - Retrieves activity logs within the specified date range
# - Computes averages for load, fatigue, and mental score metrics
# - Returns the average load, fatigue, and mental score
@csrf_exempt
def get_weekly_summary(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    data = json.loads(request.body)
    start_of_week = data.get("start_of_week")
    end_of_week = data.get("end_of_week")
    athlete_id = data.get("athlete_id")

    profile = supabase.table("profiles").select("role").eq("id", user.id).execute()
    role = profile.data[0]["role"]

    if role == "ATHLETE":
        athlete_id = user.id

    if not start_of_week or not end_of_week:
        return JsonResponse({"error": "Missing information"}, status=400)

    if not athlete_id:
        return JsonResponse({"error": "Missing athlete_id"}, status=400)

    logs = supabase.table("activity_logs").select(
        "load, fatigue, mental_score"
    ).eq("athlete_id", athlete_id).gte("date", start_of_week).lt(
        "date", end_of_week
    ).execute()

    if not logs.data:
        return JsonResponse({
            "summary": {
                "average_load": 0,
                "average_fatigue": 0,
                "average_mental_score": 0
            }
        })

    total = len(logs.data)
    avg_load = sum(log["load"] for log in logs.data) / total
    avg_fatigue = sum(log["fatigue"] for log in logs.data) / total
    avg_mental = sum(log["mental_score"] for log in logs.data) / total

    return JsonResponse({
        "summary": {
            "average_load": round(avg_load, 2),
            "average_fatigue": round(avg_fatigue, 2),
            "average_mental_score": round(avg_mental, 2)
        }
    })

#Method for logging activity
# - Allows only athletes to log activity data
# - Inserts activity log in the table "activity_logs"
# - Returns success or error response
@csrf_exempt
def log_activity(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = get_user_from_token(token)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    profile = supabase.table("profiles").select("role").eq("id", user.id).execute()
    role = profile.data[0]["role"]

    if role != "ATHLETE":
        return JsonResponse({"error": "Only athletes can log activities"}, status=403)

    data = json.loads(request.body)
    date = data.get("date")
    load = data.get("load")
    fatigue = data.get("fatigue")
    mental_score = data.get("mental_score")

    if not date or load is None or fatigue is None or mental_score is None:
        return JsonResponse({"error": "All fields are required"}, status=400)

    response = supabase.table("activity_logs").insert({
        "athlete_id": user.id,
        "date": date,
        "load": load,
        "fatigue": fatigue,
        "mental_score": mental_score
    }).execute()

    if not response.data:
        return JsonResponse({"error": "Failed to log activity"}, status=400)

    return JsonResponse({"status": "success"})