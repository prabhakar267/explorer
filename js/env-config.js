// Environment Configuration Fallback
// This file is replaced during GitHub Actions build with actual environment variables
// For local development, create a .env file or configure your environment variables

window.ENV = window.ENV || {};

console.log('Using fallback environment configuration - Firebase will run in demo mode');
console.log('To enable Firebase, configure environment variables in GitHub repository secrets');
