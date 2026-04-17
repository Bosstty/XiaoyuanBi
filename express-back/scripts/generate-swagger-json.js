const fs = require('fs');
const path = require('path');
const { swaggerSpec } = require('../src/config/swagger');

const outputDir = path.resolve(__dirname, '../docs');
const outputPath = path.join(outputDir, 'swagger.generated.json');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf8');

console.log(`Swagger JSON generated: ${outputPath}`);
