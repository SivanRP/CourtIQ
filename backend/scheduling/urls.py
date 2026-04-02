from django.urls import path
from . import logic

# URL routes for scheduling
urlpatterns = [
    path("create_event/", logic.create_event),
    path("delete_event/", logic.delete_event),
    path("edit_event/", logic.edit_event),
    path("approve_reject_event/", logic.approve_reject_event_request),
    path("get_weekly_schedule/", logic.get_weekly_schedule),
    path("get_rejected_events/", logic.get_rejected_events),
    path("statistics/", logic.get_statistics),
    path("weekly_summary/", logic.get_weekly_summary),
]
