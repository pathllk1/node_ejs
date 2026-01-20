# Development Setup Guide

This guide provides detailed instructions for setting up the development environment and contributing to the Secure Express.js Authentication Application with AI Integration.

## 🛠️ Prerequisites

### Required Software

- **Node.js**: Version 14 or higher
- **npm**: Version 6 or higher (comes with Node.js)
- **Git**: For version control
- **Python**: Version 3.8 or higher (for AI microservice)
- **pip**: Python package manager

### Optional Tools

- **Yarn**: Alternative package manager
- **pnpm**: Another package manager option
- **VS Code**: Recommended IDE with extensions
- **Postman**: For API testing
- **SQLite Browser**: For database inspection
- **Docker**: For containerized development

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-typescript-next",
    "ms-python.python",
    "ms-python.vscode-pylance"
  ]
}
```

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd tst2
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for AI service
cd python_service
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
pip install fastapi uvicorn openai python-dotenv
```

### 3. Set Environment Variables

Create `.env` file in the root directory:

```bash
# Server
PORT=3000
NODE_ENV=development

# JWT Secrets (required; minimum 32 characters)
ACCESS_TOKEN_SECRET=your_development_access_token_secret_here
REFRESH_TOKEN_SECRET=your_development_refresh_token_secret_here

# Admin role (required for admin features)
ADMIN_ROLE_VALUE=1

# AI Service (Python microservice uses this)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# MongoDB (only required if you use the masterrolls module)
MONGODB_URI=mongodb://localhost:27017/your_database_name

# RapidAPI (only required for GST lookup in inventory modules)
RAPIDAPI_KEY=your_rapidapi_key_here
```

### 4. Start Development Environment

```bash
# Start all services concurrently
npm run dev

# Or start services individually:
# Terminal 1: Start Node.js server
npm run watch:server

# Terminal 2: Start CSS watcher
npm run watch:css

# Terminal 3: Start Python AI service
cd python_service && venv\Scripts\python -m uvicorn main:app --reload --port 5200
```

The application will start on `http://localhost:3000`
The Python AI service will start on `http://localhost:5200`

Note: `npm run dev` starts multiple watchers (Tailwind watch + Nodemon + Uvicorn reload). For production servers use `npm start`.

## 📁 Project Structure

```
tst2/
├── app.js                    # Main application file
├── bin/
│   └── www                   # Server entry point
├── config/
│   ├── app.db               # SQLite database
│   ├── app.db-shm           # SQLite shared memory
│   ├── app.db-wal           # SQLite write-ahead log
│   └── db.js                # Database configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── aiController.js      # AI integration logic
│   └── adminController.js   # Admin functionality
├── docs/                    # Documentation
│   ├── API.md              # API documentation
│   ├── SECURITY.md         # Security documentation
│   └── DEVELOPMENT.md      # This file
├── middleware/
│   ├── authMiddleware.js    # Authentication middleware
│   ├── csp.js              # Content Security Policy
│   ├── requestLogger.js     # Request logging
│   └── sanitizer.js        # Input sanitization
├── public/
│   ├── images/             # Static images
│   ├── javascripts/        # Client-side JavaScript
│   │   ├── api.js          # API client with interceptors
│   │   ├── auth.js         # Authentication logic
│   │   ├── dashboard.js    # Dashboard functionality
│   │   ├── navbar.js       # Navigation logic
│   │   └── ai-client.js    # AI client logic
│   └── stylesheets/        # Compiled CSS
├── python_service/         # AI Microservice
│   ├── main.py            # FastAPI application
│   ├── db_client.py       # Database client
│   ├── venv/              # Python virtual environment
│   └── requirements.txt   # Python dependencies
├── routes/
│   ├── index.js            # Main routes
│   ├── users.js            # User-related routes
│   ├── ai_py_route.js      # AI integration routes
│   └── admin.js            # Admin routes
├── styles/
│   └── input.css           # Tailwind CSS input
├── views/
│   ├── components/         # EJS components
│   │   ├── footer.ejs      # Footer component
│   │   ├── navbar.ejs      # Navigation component
│   │   └── toast.ejs       # Toast notification component
│   ├── layouts/           # EJS layout templates
│   │   └── main.ejs       # Main layout template
│   ├── ai-dashboard.ejs   # AI dashboard
│   ├── chat.ejs           # AI chat interface
│   ├── admin/
│   │   └── logs.ejs       # Admin logs view
│   └── *.ejs              # View templates
├── package.json           # Package configuration
├── package-lock.json      # Lock file
├── .gitignore            # Git ignore rules
├── README.md             # Main documentation
└── SECURITY_DOCUMENTATION.js # Security implementation summary
```

## 🔧 Development Workflow

### Development Commands

```bash
# Start development server with auto-restart and CSS watching
npm run dev

# Start only the CSS watcher
npm run watch:css

# Start only the server
npm run watch:server

# Start Python AI service
npm run watch:python

# Build CSS manually
npm run build:css

# Start production server
npm start

# Run linting (if configured)
npm run lint

# Run tests (if configured)
npm test
```

### Development Server Features

- **Auto-restart**: Server restarts on file changes
- **CSS Watching**: Tailwind CSS rebuilds on changes
- **Hot Reload**: Browser refreshes on CSS changes
- **Error Handling**: Detailed error messages in development
- **Concurrent Services**: Node.js and Python services run together

## 🎨 Frontend Development

### CSS Development

The application uses Tailwind CSS for styling:

1. **Edit styles** in `styles/input.css`
2. **CSS is automatically rebuilt** when watching
3. **Changes appear immediately** in the browser

### JavaScript Development

Client-side JavaScript files are located in `public/javascripts/`:

- **api.js**: API client with request/response interceptors
- **auth.js**: Authentication logic and token management
- **dashboard.js**: Dashboard functionality
- **navbar.js**: Navigation logic
- **ai-client.js**: AI dashboard client logic

### Template Development

Views use EJS templating:

- **Layouts**: `views/layouts/main.ejs`
- **Components**: `views/components/`
- **Pages**: `views/*.ejs`
- **AI Templates**: `views/ai-dashboard.ejs`, `views/chat.ejs`
- **Admin Templates**: `views/admin/logs.ejs`

### AI Client Development

The AI client (`public/javascripts/ai-client.js`) includes:

- **Sentiment Analysis**: Text analysis via Python microservice
- **Chat Interface**: Conversational AI integration
- **Real-time Updates**: Live result display with animations
- **Error Handling**: Graceful fallbacks for service unavailability

## 🗄️ Database Development

### SQLite Database

The application uses Turso Cloud database with @libsql/client:

- **Database file**: `config/app.db`
- **Schema**: Defined in `config/db.js`
- **Migration**: Handled automatically on startup
- **Shared Access**: Both Node.js and Python services access the same database

### Database Tables

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  fullname TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Request logs table
CREATE TABLE request_logs (
  id INTEGER PRIMARY KEY,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Database Tools

For database inspection and management:

- **SQLite Browser**: [DB Browser for SQLite](https://sqlitebrowser.org/)
- **Command Line**: `sqlite3 config/app.db`
- **VS Code Extension**: SQLite Viewer
- **Python Client**: `python_service/db_client.py`

## 🤖 AI Microservice Development

### Python Service Setup

1. **Navigate to Python service directory**:
   ```bash
   cd python_service
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate     # Windows
   ```

3. **Install dependencies**:
   ```bash
   pip install fastapi uvicorn openai python-dotenv
   ```

4. **Set environment variables**:
   Create `.env` file in `python_service/`:
   ```bash
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

5. **Start the service**:
   ```bash
   uvicorn main:app --reload --port 5200
   ```

### AI Service Endpoints

- **GET /**: Health check
- **POST /analyze**: Text sentiment analysis
- **POST /chat**: Conversational AI
- **GET /logs**: System logs

### AI Integration

The Node.js application communicates with the Python service:

1. **Authentication**: All AI endpoints require JWT tokens
2. **Request Forwarding**: Node.js forwards requests to Python service
3. **Response Processing**: Results returned to client via Node.js
4. **Error Handling**: Graceful fallbacks for service issues

## 🔐 Security Development

### JWT Secrets

For development, you can set custom JWT secrets:

```bash
# Set environment variables
export JWT_SECRET=your-development-secret
export JWT_REFRESH_SECRET=your-refresh-secret
```

### Security Headers

Security headers are configured in `middleware/csp.js`:

- **CSP**: Content Security Policy
- **XSS Protection**: Cross-site scripting protection
- **Frame Options**: Clickjacking prevention
- **Content Type**: MIME type validation

### Input Sanitization

Input sanitization is handled in `middleware/sanitizer.js`:

- **XSS Protection**: Using the `xss` library
- **Input Validation**: All request data is sanitized
- **Custom Rules**: Configure sanitization rules as needed

### AI Service Security

- **API Key Protection**: OpenRouter API keys in environment variables
- **Input Validation**: Pydantic models for type safety
- **Response Validation**: JSON parsing with error recovery
- **Error Handling**: No information leakage

## 🧪 Testing

### Manual Testing

1. **Start the development server**: `npm run dev`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Test functionality**:
   - User registration and login
   - Dashboard access
   - Protected routes
   - Token refresh
   - AI features (sentiment analysis, chat)
   - Admin features (request logs)

### API Testing

Use tools like Postman or curl to test API endpoints:

```bash
# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Test AI analysis
curl -X POST http://localhost:3000/ai/api/ai-check \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Refresh-Token: <refresh_token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"I love this application!"}'

# Test admin logs
curl -X GET http://localhost:3000/admin/logs \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Refresh-Token: <refresh_token>"
```

### Python Service Testing

```bash
# Test Python service directly
curl http://localhost:5200/

# Test AI analysis
curl -X POST http://localhost:5200/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"I love this application!"}'

# Test chat
curl -X POST http://localhost:5200/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello", "history":[]}'
```

### Security Testing

Test security features:

1. **XSS Protection**: Try injecting scripts in forms
2. **CSP**: Verify CSP headers are present
3. **Authentication**: Test unauthorized access
4. **Token Expiry**: Test token refresh mechanism
5. **AI Input Validation**: Test malicious input handling

## 🚀 Production Deployment

### Environment Variables

Set these environment variables for production:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-production-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
DB_PATH=./config/app.db
OPENROUTER_API_KEY=your-openrouter-api-key
```

### Build Process

1. **Install production dependencies**:
   ```bash
   npm ci --only=production
   ```

2. **Build CSS**:
   ```bash
   npm run build:css
   ```

3. **Start production server**:
   ```bash
   npm start
   ```

4. **Start Python service**:
   ```bash
   cd python_service
   uvicorn main:app --port 5200
   ```

### Docker Deployment

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  node-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - DB_PATH=/app/config/app.db
    volumes:
      - ./config:/app/config
    depends_on:
      - python-service

  python-service:
    build: ./python_service
    ports:
      - "5200:5200"
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    volumes:
      - ./config:/app/config
```

Build and run:
```bash
docker-compose up -d
```

## 🔄 Contributing

### Code Style

- **JavaScript**: Follow existing patterns
- **Python**: Use PEP 8 style guide
- **CSS**: Use Tailwind classes
- **EJS**: Keep templates clean and organized
- **Comments**: Add comments for complex logic

### Git Workflow

1. **Create branch**: `git checkout -b feature/your-feature`
2. **Make changes**: Implement your feature
3. **Commit changes**: `git commit -m "Add your feature"`
4. **Push to origin**: `git push origin feature/your-feature`
5. **Create PR**: Open pull request on GitHub

### Pull Request Guidelines

- **Small PRs**: Keep changes focused and small
- **Clear description**: Explain what the PR does
- **Test changes**: Ensure functionality works
- **Update docs**: Update documentation if needed
- **AI Integration**: Test both Node.js and Python components

## 🐛 Debugging

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Python Service Not Starting
```bash
# Check Python version
python --version

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

#### Database Issues
```bash
# Reset database
rm config/app.db
rm config/app.db-shm
rm config/app.db-wal
```

#### CSS Not Updating
```bash
# Rebuild CSS manually
npm run build:css
```

### Debug Tools

- **Node.js Inspector**: `node --inspect bin/www`
- **Python Debugger**: `python -m pdb main.py`
- **Browser DevTools**: For frontend debugging
- **Console Logging**: Use `console.log()` for debugging
- **VS Code Debugger**: Set breakpoints in code

## 📊 Performance

### Optimization Tips

1. **CSS**: Use Tailwind's purge feature in production
2. **JavaScript**: Minimize client-side code
3. **Database**: Add indexes for frequently queried fields
4. **Caching**: Consider adding response caching
5. **AI Service**: Implement request queuing for high load

### Monitoring

- **Request Logs**: Check `config/app.db` for request patterns
- **Performance**: Monitor response times
- **Errors**: Check server logs for errors
- **AI Usage**: Monitor API calls and costs
- **Database**: Monitor query performance

## 📚 Additional Resources

### Core Technologies
- [Express.js Documentation](https://expressjs.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [EJS Documentation](https://ejs.co/)
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)
- [jsonwebtoken Documentation](https://www.npmjs.com/package/jsonwebtoken)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)

### AI Integration
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/)

### Development Tools
- [Nodemon Documentation](https://nodemon.io/)
- [Concurrently Documentation](https://www.npmjs.com/package/concurrently)
- [Tailwind CLI Documentation](https://tailwindcss.com/docs/installation)

## 🆘 Getting Help

### Documentation
- [README.md](README.md) - Main project documentation
- [API.md](docs/API.md) - API documentation
- [SECURITY.md](docs/SECURITY.md) - Security documentation

### Issues
- Check existing [issues](https://github.com/your-repo/issues)
- Create new issue with detailed description
- Include reproduction steps
- Specify if issue relates to Node.js, Python, or both

### Community
- Join discussions on GitHub
- Ask questions in relevant forums
- Contribute to documentation
- Share AI integration improvements

---

**Note**: This development guide is designed to help contributors understand the project structure and development workflow. Always follow security best practices when developing and deploying the application. The dual-service architecture (Node.js + Python) requires careful coordination between services for optimal performance and security.