:tocdepth: 2
API
===

This part of the documentation lists the full API reference of all classes and functions.

WSGI
----

.. autoclass:: api_container.wsgi.ApplicationLoader
   :members:
   :show-inheritance:

Config
------

.. automodule:: api_container.config

.. autoclass:: api_container.config.application.Application
   :members:
   :show-inheritance:

.. autoclass:: api_container.config.redis.Redis
   :members:
   :show-inheritance:

.. automodule:: api_container.config.gunicorn

CLI
---

.. automodule:: api_container.cli

.. autofunction:: api_container.cli.cli.cli

.. autofunction:: api_container.cli.utils.validate_directory

.. autofunction:: api_container.cli.serve.serve

App
---

.. automodule:: api_container.app

.. autofunction:: api_container.app.asgi.on_startup

.. autofunction:: api_container.app.asgi.on_shutdown

.. autofunction:: api_container.app.asgi.get_application

.. automodule:: api_container.app.router

Controllers
~~~~~~~~~~~

.. automodule:: api_container.app.controllers

.. autofunction:: api_container.app.controllers.ready.readiness_check

Models
~~~~~~

.. automodule:: api_container.app.models

Views
~~~~~

.. automodule:: api_container.app.views

.. autoclass:: api_container.app.views.error.ErrorModel
   :members:
   :show-inheritance:

.. autoclass:: api_container.app.views.error.ErrorResponse
   :members:
   :show-inheritance:

Exceptions
~~~~~~~~~~

.. automodule:: api_container.app.exceptions

.. autoclass:: api_container.app.exceptions.http.HTTPException
   :members:
   :show-inheritance:

.. autofunction:: api_container.app.exceptions.http.http_exception_handler

Utils
~~~~~

.. automodule:: api_container.app.utils

.. autoclass:: api_container.app.utils.aiohttp_client.AiohttpClient
   :members:
   :show-inheritance:

.. autoclass:: api_container.app.utils.redis.RedisClient
   :members:
   :show-inheritance:
