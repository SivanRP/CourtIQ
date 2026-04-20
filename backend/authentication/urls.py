from django.urls import path
from . import logic

# URLs routes for user authentication: signup and log in
urlpatterns = [
    path("signup/", logic.sign_up),
    path("login/", logic.log_in),
    path("logout/", logic.log_out),
    path("get_profile/", logic.get_profile),
    path("link/", logic.link_users),
    path("unlink/", logic.unlink_athlete),
    path("linked/", logic.get_linked),
    path("reset_password/", logic.reset_password),
    path("update_password/", logic.update_password),
]
