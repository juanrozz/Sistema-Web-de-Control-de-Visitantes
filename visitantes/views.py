import requests
from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse_lazy
from django.utils import timezone
from .models import Visitante
import os

class CustomLoginView(LoginView):
    template_name = 'visitantes/login.html'
    redirect_authenticated_user = True  

    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            logout(request)
        return super().get(request, *args, **kwargs)

    def get_success_url(self):
        user = self.request.user
        if user.is_admin() or user.is_superuser:
            return reverse_lazy('admin:index')
        return reverse_lazy('visitantes:index')


@login_required
def index(request):
    # Si es admin, lo enviamos a su panel de administración
    if request.user.is_admin() or request.user.is_superuser:
        return redirect('admin:index')

    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        origen = request.POST.get('origen')
        sede = request.POST.get('sede')
        motivo = request.POST.get('motivo')

        Visitante.objects.create(
            nombre=nombre,
            origen=origen,
            sede=sede,
            motivo=motivo,
            activo=True,
            registrado_por=request.user, 
        )
        return redirect('visitantes:index')

    lista_visitantes = Visitante.objects.filter(activo=True).order_by('-fecha_ingreso')
    return render(
        request,
        'visitantes/index.html',
        {
            'lista_visitantes': lista_visitantes,
            'sedes': Visitante.SEDES,  
        }
    )


@login_required
def detalle(request, visitante_id):
    visitante = get_object_or_404(Visitante, pk=visitante_id)

    if request.method == 'POST':
        visitante.nombre = request.POST.get('nombre')
        visitante.origen = request.POST.get('origen')
        visitante.sede = request.POST.get('sede')
        visitante.motivo = request.POST.get('motivo')
        visitante.save()
        return redirect('visitantes:index')

    return render(
        request,
        'visitantes/detalle.html',
        {'visitante': visitante, 'sedes': Visitante.SEDES}
    )


@login_required
def desactivar(request, visitante_id):
    visitante = get_object_or_404(Visitante, pk=visitante_id)
    if request.method == 'POST':
        visitante.activo = False
        visitante.fecha_salida = timezone.now()
        visitante.save()
        return redirect('visitantes:index')

    return render(request, 'visitantes/detalle.html', {'visitante': visitante})


@login_required
def historial(request):
    activos = Visitante.objects.filter(activo=True).order_by('-fecha_ingreso')
    inactivos = Visitante.objects.filter(activo=False).order_by('-fecha_salida')
    return render(
        request,
        'visitantes/historial.html',
        {'activos': activos, 'inactivos': inactivos},
    )


@login_required
def reporte_ia(request):
    solo_activos = Visitante.objects.filter(activo=True)
    total_historico = Visitante.objects.count()

    datos_enviar = [
        {
            'nombre': v.nombre,
            'origen': v.origen,
            'sede': v.get_sede_display(),
            'motivo': v.motivo,
            'fecha_ingreso': v.fecha_ingreso.strftime('%Y-%m-%d %H:%M'),
        }
        for v in solo_activos
    ]

    analisis_ia = "No se pudo conectar con el microservicio de IA."
    url_microservicio = os.environ.get(
        'NODE_IA_URL',
        'https://onrender.com'
    )
    try:
        respuesta = requests.post(
            url_microservicio,
            json={
                'visitantes': datos_enviar,
                'total_historico': total_historico,
            },
            timeout=20
        )
        if respuesta.status_code == 200:
            analisis_ia = respuesta.json().get('analisis', '')
        else:
            analisis_ia = f"Error del microservicio: {respuesta.text}"
    except Exception as e:
        analisis_ia = f"Error de conexión con Node.js: {str(e)}"

    activos = Visitante.objects.filter(activo=True).order_by('-fecha_ingreso')
    inactivos = Visitante.objects.filter(activo=False).order_by('-fecha_salida')
    return render(
        request,
        'visitantes/historial.html',
        {
            'activos': activos,
            'inactivos': inactivos,
            'analisis_ia': analisis_ia,
        },
    )
