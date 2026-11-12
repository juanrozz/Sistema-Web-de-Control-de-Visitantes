from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("visitantes/", include("visitantes.urls")),
    path("admin/", admin.site.urls),
]

