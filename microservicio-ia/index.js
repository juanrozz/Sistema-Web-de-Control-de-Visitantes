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
  const { visitantes, total_historico } = req.body;
  const activosCount = visitantes ? visitantes.length : 0;
  const historicoCount = total_historico || activosCount;

  if (activosCount === 0) {
    return res.json({
      analisis: `Informe de Relevo: Se registran ${historicoCount} ingresos en el historial, pero actualmente hay 0 visitantes adentro de las instalaciones. Sin novedades de seguridad.`,
    });
  }

  try {
    const horaActual = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const prompt = `Actúa como un jefe de seguridad universitaria. La hora actual es ${horaActual}. El historial total tiene ${historicoCount} registros, y actualmente siguen ADENTRO de las instalaciones estas ${activosCount} personas:
    ${JSON.stringify(visitantes)}

Entrega un informe de relevo de turno (máximo 4 líneas):
1. Indica cuántos visitantes siguen adentro frente al total histórico y qué sede tiene mayor movimiento actual.
2. Evalúa si alguno de estos visitantes activos presenta anomalías (permanencia excesiva para entregas/domicilios o incoherencia entre empresa de origen y motivo). Nombra al visitante y su sede si hay novedad, o confirma que todo está en orden.`;

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

    const sedes = [...new Set(visitantes.map((v) => v.sede))].join(', ');
    const domicilios = visitantes.filter((v) =>
      /pizza|domicilio|entrega|paquete|rappi|servientrega/i.test(`${v.origen} ${v.motivo}`)
    );

    let novedad = 'Sin alertas críticas de seguridad en los visitantes activos.';
    if (domicilios.length > 0) {
      const lista = domicilios
        .map((d) => `${d.nombre} (${d.origen} - ${d.sede}, ingresó: ${d.fecha_ingreso})`)
        .join('; ');
      novedad = `Novedad de Permanencia: Verificar salida pendiente de entrega rápida -> ${lista}.`;
    }

    return res.json({
      analisis: `Informe de Relevo: Hay ${activosCount} visitante(s) actualmente adentro (de ${historicoCount} registros totales). Sedes activas: ${sedes}. ${novedad}`,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Microservicio Node.js corriendo en http://0.0.0.0:${PORT}`);
});
