from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

urlpatterns = [
     path('', RedirectView.as_view(url='/visitantes/', permanent=False)),
    path("visitantes/", include("visitantes.urls")),
    path("admin/", admin.site.urls),
]

