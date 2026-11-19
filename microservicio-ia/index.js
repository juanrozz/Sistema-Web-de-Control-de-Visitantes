const https = require('https');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const API_KEY = process.env.GEMINI_API_KEY || '';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Microservicio IA - Control de Visitantes',
      version: '1.0.0',
      description: 'Microservicio en Node.js que analiza registros de portería usando IA Generativa.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local / Contenedor Docker',
      },
    ],
  },
  apis: ['./index.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verifica el estado activo del microservicio
 *     responses:
 *       200:
 *         description: Microservicio operativo
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    servicio: 'Microservicio IA Node.js activo',
    apiKeyConfigurada: API_KEY ? 'Sí' : 'No',
  });
});

/**
 * @swagger
 * /api/analizar:
 *   post:
 *     summary: Genera un reporte inteligente de seguridad y afluencia con IA Generativa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               visitantes:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Análisis generado por IA exitosamente
 */
app.post('/api/analizar', async (req, res) => {
  const { visitantes } = req.body;
  console.log('Petición recibida desde Django. Visitantes:', visitantes?.length || 0);

  if (!visitantes || visitantes.length === 0) {
    return res.json({
      analisis: 'No hay visitantes registrados para analizar en este momento.',
    });
  }

  try {
    const prompt = `Actúa como un jefe de seguridad universitaria. Analiza esta lista de visitantes en formato JSON y entrega un resumen ejecutivo (máximo 5 líneas):
1. Indica el total de visitantes, cuántos siguen activos y la sede con mayor movimiento.
2. Si detectas motivos sospechosos o incoherentes (ej. objetos peligrosos, paquetes sin remitente, ingreso a zonas restringidas sin permiso, datos falsos), emite una ALERTA CRÍTICA DE SEGURIDAD nombrando explícitamente al visitante sospechoso, su empresa de origen, la sede donde ingresó y el motivo exacto. Si todo es normal, indica que no hay novedades críticas.

Datos de portería: ${JSON.stringify(visitantes)}`;

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      family: 4,
      rejectUnauthorized: false,
      timeout: 15000,
    };

    const respuestaGoogle = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, data: JSON.parse(body) });
          } catch (e) {
            reject(new Error('Respuesta no válida de Google: ' + body));
          }
        });
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Tiempo de espera agotado en Google (15s)'));
      });

      request.on('error', (err) => reject(err));
      request.write(payload);
      request.end();
    });

    if (respuestaGoogle.status !== 200) {
      throw new Error(respuestaGoogle.data.error?.message || 'Error en API Gemini');
    }

    let respuestaIA = 'No se obtuvo texto de respuesta.';
    if (
      respuestaGoogle.data &&
      respuestaGoogle.data.candidates &&
      respuestaGoogle.data.candidates.length > 0
    ) {
      respuestaIA = respuestaGoogle.data.candidates[0].content.parts[0].text;
    }

    console.log('Respuesta generada con éxito por Gemini.');
    return res.json({ analisis: respuestaIA });
  } catch (error) {
    console.error('Fallo o saturación en Gemini, usando análisis de respaldo:', error.message);

    const activos = visitantes.filter((v) => v.activo).length;
    const sedes = [...new Set(visitantes.map((v) => v.sede))].join(', ');
    const sospechosos = visitantes.filter((v) =>
      /sospechoso|arma|paquete|sin permiso|restringid|bomba|cuchillo|droga/i.test(v.motivo)
    );

    let alerta = 'Sin alertas críticas de seguridad.';
    if (sospechosos.length > 0) {
      const detalles = sospechosos
        .map((s) => `${s.nombre} (Sede: ${s.sede} - Motivo: "${s.motivo}")`)
        .join('; ');
      alerta = `ALERTA CRÍTICA: Revisar inmediatamente a -> ${detalles}.`;
    }

    return res.json({
      analisis: `Resumen de Seguridad: Se registran ${visitantes.length} visitantes en total (${activos} activos). Sedes con actividad: ${sedes}. ${alerta}`,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Microservicio Node.js corriendo en http://0.0.0:${PORT}`);
});
