from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Visitante


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = (
        'username',
        'first_name',
        'last_name',
        'role',
        'is_staff',
    )
    list_filter = ('role', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Rol del Usuario', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Rol del Usuario', {'fields': ('role',)}),
    )


@admin.register(Visitante)
class VisitanteAdmin(admin.ModelAdmin):
    # Aquí ves claramente quién entró, a qué sede y qué celador lo dejó pasar
    list_display = (
        'nombre',
        'origen',
        'sede',
        'fecha_ingreso',
        'fecha_salida',
        'activo',
        'registrado_por',
    )
    list_filter = ('sede', 'activo', 'fecha_ingreso', 'registrado_por')
    search_fields = ('nombre', 'origen', 'registrado_por__username')
    readonly_fields = ('fecha_ingreso',)
