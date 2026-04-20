import os
import socket
from django.urls import path, include
from django.http import JsonResponse

def health(request):
    url = os.environ.get("SUPABASE_DB_URL", "NOT_SET").strip()
    key = os.environ.get("SUPABASE_KEY", "NOT_SET").strip()
    hostname = url.replace("https://", "").replace("http://", "").split("/")[0]
    try:
        ip = socket.gethostbyname(hostname)
        dns = f"ok: {ip}"
    except Exception as e:
        dns = f"FAIL: {e}"
    return JsonResponse({
        "url_used": url[:50],
        "key_prefix": key[:12],
        "hostname": hostname,
        "dns": dns,
    })

urlpatterns = [
    path('api/auth/', include('authentication.urls')),
    path('api/scheduling/', include('scheduling.urls')),
    path('health/', health),
]

