from django.urls import path
from . import logic

# URLs routes for user authentication: signup and log in
urlpatterns = [
    path("signup/", logic.sign_up),
    path("login/", logic.log_in),
    path("athletes/", logic.get_linked_athletes),
]
