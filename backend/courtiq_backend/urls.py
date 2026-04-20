import os
from django.urls import path, include
from django.http import JsonResponse

def health(request):
    return JsonResponse({
        "status": "ok",
        "supabase_url_set": bool(os.environ.get("SUPABASE_URL")),
        "supabase_key_set": bool(os.environ.get("SUPABASE_KEY")),
    })

urlpatterns = [
    path('api/auth/', include('authentication.urls')),
    path('api/scheduling/', include('scheduling.urls')),
    path('health/', health),
]

