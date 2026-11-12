from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLES = (
        ('admin', 'Administrador'),
        ('celador', 'Celador'),
    )
    role = models.CharField(
        max_length=20,
        choices=ROLES,
        default='celador',
        verbose_name='Rol'
    )

    def is_admin(self):
        return self.role == 'admin'

    def is_celador(self):
        return self.role == 'celador'


class Visitante(models.Model):
    SEDES = (
        ('norte', 'Sede Norte'),
        ('centro', 'Sede Centro'),
        ('sur', 'Sede Sur'),
    )

    nombre = models.CharField(max_length=100)
    origen = models.CharField(max_length=100)
    sede = models.CharField(
        max_length=20,
        choices=SEDES,
        default='centro',
        verbose_name='Sede de ingreso'
    )
    motivo = models.TextField()
    fecha_ingreso = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    fecha_salida = models.DateTimeField(null=True, blank=True)
    registrado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Celador que registró'
    )

    def __str__(self):
        estado = "Activo" if self.activo else "Inactivo"
        return f"{self.nombre} - {self.get_sede_display()} ({estado})"
