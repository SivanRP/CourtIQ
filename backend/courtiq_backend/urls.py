from django.urls import path, include
from django.contrib import admin

#Project URL authentication app
urlpatterns = [
    path('api/auth/', include('authentication.urls')),
    path('api/scheduling/', include('scheduling.urls')),
]

