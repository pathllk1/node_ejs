# Development Setup Guide

This guide provides detailed instructions for setting up the development environment and contributing to the Secure Express.js Authentication Application.

## 🛠️ Prerequisites

### Required Software

- **Node.js**: Version 14 or higher
- **npm**: Version 6 or higher (comes with Node.js)
- **Git**: For version control

### Optional Tools

- **Yarn**: Alternative package manager
- **pnpm**: Another package manager option
- **VS Code**: Recommended IDE with extensions
- **Postman**: For API testing
- **SQLite Browser**: For database inspection

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
    "ms-vscode.vscode-typescript-next"
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
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The application will start on `http://localhost:3000`

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
│   └── authController.js    # Authentication logic
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
│   │   └── navbar.js       # Navigation logic
│   └── stylesheets/        # Compiled CSS
├── routes/
│   ├── index.js            # Main routes
│   └── users.js            # User-related routes
├── styles/
│   └── input.css           # Tailwind CSS input
├── views/
│   ├── components/         # EJS components
│   │   ├── footer.ejs      # Footer component
│   │   ├── navbar.ejs      # Navigation component
│   │   └── toast.ejs       # Toast notification component
│   ├── layouts/           # EJS layout templates
│   │   └── main.ejs       # Main layout template
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

### Template Development

Views use EJS templating:

- **Layouts**: `views/layouts/main.ejs`
- **Components**: `views/components/`
- **Pages**: `views/*.ejs`

## 🗄️ Database Development

### SQLite Database

The application uses SQLite with better-sqlite3:

- **Database file**: `config/app.db`
- **Schema**: Defined in `config/db.js`
- **Migration**: Handled automatically on startup

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

## 🧪 Testing

### Manual Testing

1. **Start the development server**: `npm run dev`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Test functionality**:
   - User registration
   - User login
   - Dashboard access
   - Protected routes
   - Token refresh

### API Testing

Use tools like Postman or curl to test API endpoints:

```bash
# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Test protected endpoint
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Refresh-Token: <refresh_token>"
```

### Security Testing

Test security features:

1. **XSS Protection**: Try injecting scripts in forms
2. **CSP**: Verify CSP headers are present
3. **Authentication**: Test unauthorized access
4. **Token Expiry**: Test token refresh mechanism

## 🚀 Production Deployment

### Environment Variables

Set these environment variables for production:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-production-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
DB_PATH=./config/app.db
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

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build:css

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t secure-app .
docker run -p 3000:3000 secure-app
```

## 🔄 Contributing

### Code Style

- **JavaScript**: Follow existing patterns
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

## 🐛 Debugging

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
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
- **Browser DevTools**: For frontend debugging
- **Console Logging**: Use `console.log()` for debugging
- **VS Code Debugger**: Set breakpoints in code

## 📊 Performance

### Optimization Tips

1. **CSS**: Use Tailwind's purge feature in production
2. **JavaScript**: Minimize client-side code
3. **Database**: Add indexes for frequently queried fields
4. **Caching**: Consider adding response caching

### Monitoring

- **Request Logs**: Check `config/app.db` for request patterns
- **Performance**: Monitor response times
- **Errors**: Check server logs for errors

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [EJS Documentation](https://ejs.co/)
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)
- [jsonwebtoken Documentation](https://www.npmjs.com/package/jsonwebtoken)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)

## 🆘 Getting Help

### Documentation
- [README.md](README.md) - Main project documentation
- [API.md](docs/API.md) - API documentation
- [SECURITY.md](docs/SECURITY.md) - Security documentation

### Issues
- Check existing [issues](https://github.com/your-repo/issues)
- Create new issue with detailed description
- Include reproduction steps

### Community
- Join discussions on GitHub
- Ask questions in relevant forums
- Contribute to documentation

---

**Note**: This development guide is designed to help contributors understand the project structure and development workflow. Always follow security best practices when developing and deploying the application.