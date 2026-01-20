# Secure Express.js Authentication Application

A modern, security-focused web application built with Express.js, featuring dual-token authentication, comprehensive security middleware, and a clean, responsive UI.

## 🛡️ Security Features

- **Dual-Token Authentication**: Short-lived access tokens (15 minutes) + long-lived refresh tokens (7 days)
- **Input Sanitization**: XSS protection using the `xss` library
- **Content Security Policy (CSP)**: Strict policies blocking inline scripts and external resources
- **Security Headers**: X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, and more
- **Request Logging**: Comprehensive audit trail for all incoming requests
- **Password Hashing**: Secure bcrypt hashing for user passwords

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Security Implementation](#security-implementation)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **User Authentication**: Secure login and registration system
- **Auto Token Refresh**: Seamless authentication with automatic token refresh
- **Request Logging**: Detailed logging of all incoming requests for security auditing
- **Responsive Design**: Clean, modern UI built with Tailwind CSS
- **Security Middleware**: Multi-layered security architecture
- **Database**: Turso Cloud database for data persistence

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT token generation and verification
- **@libsql/client** - Turso database driver
- **xss** - Input sanitization and XSS protection

### Frontend
- **EJS** - Template engine
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - Client-side logic

### Development Tools
- **Nodemon** - Development server with auto-restart
- **Concurrently** - Run multiple commands simultaneously
- **Tailwind CLI** - CSS build tool

## 🚀 Installation

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tst2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Development Commands

```bash
# Start development server with auto-restart
npm run dev

# Start only the CSS watcher
npm run watch:css

# Start only the server
npm run watch:server

# Build CSS manually
npm run build:css

# Start production server
npm start
```

## 📖 Usage

### User Registration
1. Navigate to `/signup`
2. Fill in the registration form
3. Submit to create a new account

### User Login
1. Navigate to `/login`
2. Enter your credentials
3. Click login to authenticate

### Dashboard Access
- After successful authentication, users are redirected to the dashboard
- The dashboard displays user information and provides logout functionality
- All protected routes require valid authentication tokens

### API Usage
The application provides RESTful API endpoints for authentication:

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/users/profile` - Get user profile (protected)

## 🔐 Security Implementation

This application implements a multi-layered security architecture:

### 1. Input Sanitization
All incoming requests are sanitized to prevent XSS attacks using the `xss` library.

### 2. Authentication System
- **Access Tokens**: Short-lived (15 minutes) for API requests
- **Refresh Tokens**: Long-lived (7 days) for obtaining new access tokens
- **Auto-Refresh**: Transparent token refresh mechanism

### 3. Content Security Policy
Strict CSP policies block:
- Inline scripts and styles
- External scripts and resources
- eval() and other dangerous functions
- Mixed content (HTTP on HTTPS pages)

### 4. Security Headers
Comprehensive security headers including:
- X-Frame-Options: DENY (prevents clickjacking)
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### 5. Request Logging
All incoming requests are logged for security auditing and monitoring.

For detailed security documentation, see [SECURITY.md](docs/SECURITY.md).

## 🧪 Testing

To test the application:

1. Start the development server: `npm run dev`
2. Open your browser and navigate to the application
3. Test user registration and login functionality
4. Verify that protected routes require authentication
5. Check that security headers are present in responses

## 🔄 Development

### Project Structure
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
├── docs/                    # Documentation directory
├── middleware/
│   ├── authMiddleware.js    # Authentication middleware
│   ├── csp.js              # Content Security Policy
│   ├── requestLogger.js     # Request logging
│   └── sanitizer.js        # Input sanitization
├── public/
│   ├── images/             # Static images
│   ├── javascripts/        # Client-side JavaScript
│   └── stylesheets/        # Compiled CSS
├── routes/
│   ├── index.js            # Main routes
│   └── users.js            # User-related routes
├── styles/
│   └── input.css           # Tailwind CSS input
├── views/
│   ├── components/         # EJS components
│   ├── layouts/           # EJS layout templates
│   └── *.ejs              # View templates
└── package*.json          # Package configuration
```

### Adding New Features
1. Create new routes in the `routes/` directory
2. Add corresponding controllers in `controllers/`
3. Update middleware as needed in `middleware/`
4. Create views in `views/` using EJS
5. Update CSS in `styles/input.css` and rebuild

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Use ESLint for linting (if configured)
- Follow existing code patterns
- Add appropriate comments for complex logic
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [documentation](docs/)
2. Review existing [issues](https://github.com/your-repo/issues)
3. Create a new issue with detailed information

## 🔗 Related Projects

- [Express.js Documentation](https://expressjs.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)
- [jsonwebtoken Documentation](https://www.npmjs.com/package/jsonwebtoken)

---

**Note**: This application is designed for educational and demonstration purposes. For production use, consider additional security measures such as HTTPS, rate limiting, and more comprehensive input validation.