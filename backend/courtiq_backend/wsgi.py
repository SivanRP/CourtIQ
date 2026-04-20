import os
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'courtiq_backend.settings')

_startup_error = None

try:
    import django
    django.setup()

    # Force URL conf to load at startup so import errors surface immediately
    from django.conf import settings as _settings
    from importlib import import_module as _import_module
    _import_module(_settings.ROOT_URLCONF)

    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()
except Exception:
    _startup_error = traceback.format_exc()

    def application(environ, start_response):
        start_response('500 Internal Server Error', [
            ('Content-Type', 'text/plain'),
            ('Access-Control-Allow-Origin', '*'),
        ])
        return [(_startup_error or 'Unknown startup error').encode()]
