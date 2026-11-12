# 1. Descarga un mini-sistema Linux que ya trae Python 3.12 instalado
FROM python:3.12-slim

# 2. Configuraciones para que Python muestre los mensajes en pantalla sin retrasos
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Crea una carpeta llamada /app dentro de la caja y entra en ella
WORKDIR /app

# 4. Copia tu lista de ingredientes e instálalos dentro de la caja
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copia todo el código de tu proyecto dentro de la caja
COPY . /app/

# 6. Abre la puerta (puerto 8000) para que puedas entrar desde tu navegador
EXPOSE 8000

# 7. Cuando se encienda la caja, actualiza la base de datos y arranca Django
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
