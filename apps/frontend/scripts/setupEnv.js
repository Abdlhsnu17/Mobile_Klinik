const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const targets = [
  {
    description: 'Backend .env',
    filePath: path.join(rootDir, 'backend.sistem_klinik', '.env'),
    content: `# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database lokal
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sistem_klinik
DB_USER=root
DB_PASSWORD=

# Security
JWT_SECRET=your_jwt_secret_here

# Redis (opsional)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
`,
  },
  {
    description: 'Frontend .env.local',
    filePath: path.join(rootDir, 'frontend.sistem_klinik', '.env.local'),
    content: `# URL backend untuk fetch/axios
NEXT_PUBLIC_API_URL=http://localhost:4004

# URL publik aplikasi (opsional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
`,
  },
];

targets.forEach(({ description, filePath, content }) => {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  console.log(`✅ ${description} ditulis: ${path.relative(rootDir, filePath)}`);
});

console.log('🎉 Selesai membuat file environment lokal.');
