from django.urls import path
from . import logic

# NEEDS REVIEW
urlpatterns = [path("signup/", logic.log_in), path("login/", logic.sign_up)]