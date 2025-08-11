#!/usr/bin/env node

// Build script to inject GitHub repository secrets into github-secrets.js
// This script should be run during deployment to populate the secrets

const fs = require('fs');
const path = require('path');

// Environment variables to inject (same names as in .env file)
const secretNames = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_MEASUREMENT_ID'
];

// Build the secrets object from environment variables
const secrets = {};
let hasSecrets = false;

secretNames.forEach(secretName => {
    const value = process.env[secretName];
    if (value) {
        secrets[secretName] = value;
        hasSecrets = true;
    }
});

// Generate the github-secrets.js content
let content = `// GitHub Secrets Injection
// This file is generated during build time to inject repository secrets

`;

if (hasSecrets) {
    content += `// Secrets loaded from GitHub repository secrets
window.GITHUB_SECRETS = ${JSON.stringify(secrets, null, 4)};
`;
    console.log('✅ GitHub secrets injected successfully');
    console.log('📝 Secrets found:', Object.keys(secrets).join(', '));
} else {
    content += `// No secrets found in environment variables
window.GITHUB_SECRETS = {};
`;
    console.log('⚠️  No GitHub secrets found in environment variables');
    console.log('💡 Make sure to set repository secrets with the following names:');
    secretNames.forEach(name => console.log(`   - ${name}`));
}

// Write the file
const outputPath = path.join(__dirname, 'js', 'github-secrets.js');
fs.writeFileSync(outputPath, content);

console.log(`📄 Generated: ${outputPath}`);
