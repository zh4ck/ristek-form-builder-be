import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Swagger configuration options
const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Form Builder API',
            version: '1.0.0',
            description: 'API documentation for the Form Builder application',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Paths to files containing OpenAPI annotations
    apis: ['./src/routes/*.ts'], // This dynamically points to the annotations we'll write inside the route files
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
    // Serve the Swagger UI at /api-docs
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Serve the raw JSON spec optionally
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    console.log('Swagger Docs available at http://localhost:3000/api-docs');
};
