import os
import traceback
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'courtiq_backend.settings')

try:
    application = get_wsgi_application()
except Exception:
    error_text = traceback.format_exc()

    def application(environ, start_response):
        start_response('500 Internal Server Error', [
            ('Content-Type', 'text/plain'),
            ('Access-Control-Allow-Origin', '*'),
        ])
        return [error_text.encode()]
