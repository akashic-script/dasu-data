const zl = require('zip-lib');
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, './output/manifest.json');

// Check if manifest.json exists
if (!fs.existsSync(manifestPath)) {
    console.log(`File not found: ${manifestPath}`);
    return;
}

// Read and parse manifest.json
fs.readFile(manifestPath, 'utf8', (err, data) => {
    if (err) {
        console.log('Error reading manifest.json:', err);
        return;
    }

    const manifest = JSON.parse(data);
    const { id, version } = manifest[0];

    const filepath = path.join(__dirname, '../build', `${id}-${version}.dsm`);
    console.log('Saving archive to:', filepath);

    zl.archiveFolder(path.join(__dirname, './output'), filepath, {
        filter: (file) => {
            const fileName = path.basename(file);
            return fileName;
        }
    }).then(
        () => console.log('Done archiving!'),
        (err) => console.log('Error archiving:', err)
    );
});
