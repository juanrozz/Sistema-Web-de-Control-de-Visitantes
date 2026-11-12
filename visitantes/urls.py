from django.contrib.auth.views import LogoutView
from django.urls import path
from . import views

app_name = 'visitantes'
urlpatterns = [
    # Siempre que entren a la raíz (/), verán el Login
    path('', views.CustomLoginView.as_view(), name='login'),
    path(
        'logout/',
        LogoutView.as_view(next_page='visitantes:login'),
        name='logout',
    ),
    # Panel exclusivo del celador
    path('porteria/', views.index, name='index'),
    path('porteria/<int:visitante_id>/', views.detalle, name='detalle'),
    path('porteria/historial/', views.historial, name='historial'),
    path('porteria/<int:visitante_id>/desactivar/', views.desactivar, name='desactivar'),
]
