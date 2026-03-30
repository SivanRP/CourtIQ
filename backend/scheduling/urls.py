from django.urls import path
from . import logic

# URLs routes for user authentication: signup and log in
urlpatterns = [
    path("create_event/", logic.create_event),
    path("delete_event/", logic.delete_event),
    path("update_event/", logic.update_event),
    path("get_weekly_schedule/", logic.get_weekly_schedule)
]