from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse_lazy
from django.utils import timezone
from .models import Visitante


class CustomLoginView(LoginView):
    template_name = 'visitantes/login.html'
    redirect_authenticated_user = True  # Si ya inició sesión, lo manda directo a su panel

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
            registrado_por=request.user,  # Guarda qué celador lo dejó entrar
        )
        return redirect('visitantes:index')

    lista_visitantes = Visitante.objects.filter(activo=True).order_by('-fecha_ingreso')
    return render(
        request,
        'visitantes/index.html',
        {
            'lista_visitantes': lista_visitantes,
            'sedes': Visitante.SEDES,  # Enviamos las sedes al HTML
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
