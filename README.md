# Sistema de Control de Visitantes con Microservicio IA

Sistema web desarrollado en **Django** y orquestado mediante **Docker Compose** junto a un microservicio independiente en **Node.js**, documentado bajo el estándar **Swagger / OpenAPI** e integrado con **IA Generativa (Google Gemini)** para la auditoría inteligente de seguridad y detección de alertas en portería.

## Arquitectura de Servicios

* **Aplicación Principal (Django):** Puerto `8000` (`http://127.0.0`)
* **Microservicio de Auditoría IA (Node.js + Express):** Puerto `3000`
* **Documentación Interactiva de API (Swagger UI):** `http://localhost:3000/api-docs`

## Requisitos Previos

* Tener instalado **Docker Desktop** y **Docker Compose**.
* Contar con una clave de API válida de **Google AI Studio (Gemini)**.

## Despliegue Rápido con Docker Compose

1. Clonar el repositorio y entrar a la carpeta del proyecto:
   ```bash
   git clone https://github.com
   cd Sistema-Web-de-Control-de-Visitantes
   ```

2. Crear un archivo llamado `.env` en la raíz del proyecto con tu clave de API:
   ```env
   GEMINI_API_KEY=tu_api_key_de_gemini_aqui
   ```

3. Construir y encender ambos contenedores simultáneamente:
   ```bash
   docker compose up --build
   ```

4. Crear el usuario administrador inicial (en una segunda terminal):
   ```bash
   docker compose exec web python manage.py createsuperuser
   ```
