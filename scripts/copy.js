const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

function isWSL() {
    return process.platform === 'linux' && /microsoft/i.test(require('os').release());
}

function toWSLPath(winPath) {
    if (!winPath || !/^[A-Za-z]:\\/.test(winPath)) return winPath; // Skip if not a Windows path
    const driveLetter = winPath[0].toLowerCase();
    const pathWithoutDrive = winPath.slice(2).replace(/\\/g, '/');
    return `/mnt/${driveLetter}${pathWithoutDrive}`;
}

function resolvePath(envVar) {
    const raw = process.env[envVar];
    if (!raw) {
        console.error(`❌ Missing environment variable: ${envVar}`);
        process.exit(1);
    }
    return isWSL() ? toWSLPath(raw) : raw;
}

function copyDirectory(source, destination, overwrite, label) {
    try {
        fs.copySync(source, destination, { overwrite });
        console.log(`✅ Copied ${label} → ${destination}${overwrite ? ' (overwrite: true)' : ''}`);
        return true;
    } catch (err) {
        if (err.code === 'EACCES' && label === 'build') {
            console.warn(`⚠️ Warning: Permission denied when copying ${label} to ${destination}. Skipping problematic file(s). Detailed error:`, err);
            console.info(`ℹ️ You can set OVERWRITE_DSM=true in your environment to attempt overwriting files if needed.`);
        } else {
            console.error(`❌ Failed to copy ${label}:`, err);
        }
        return false;
    }
}

// Resolve destination paths from environment variables
const csvDest = resolvePath('CPY_CSV_LOCATION');
const jsonDest = resolvePath('CPY_JSON_LOCATION');
const dsmDest = resolvePath('CPY_DSM_LOCATION');

// Perform copy operations
copyDirectory(path.join(__dirname, 'input'), csvDest, true, 'input');
copyDirectory(path.join(__dirname, 'output'), jsonDest, true, 'output');
copyDirectory(path.join(__dirname, '..', 'build'), dsmDest, process.env['OVERWRITE_DSM'] === 'true', 'build');
