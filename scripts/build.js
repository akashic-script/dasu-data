const zl = require('zip-lib');
const fs = require('fs');
const path = require('path');

function checkFolderArgument() {
    const folder = process.argv[2];
    if (!folder) {
        console.error('❌ Error: Missing required folder argument.');
        process.exit(1);
    }
    return folder;
}

function checkManifestExists(outputFolder) {
    const manifestPath = path.join(outputFolder, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        console.error(`❌ File not found: ${manifestPath}`);
        process.exit(1);
    }
    return manifestPath;
}

function readAndParseManifest(manifestPath) {
    try {
        const data = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(data);
        if (!Array.isArray(manifest) || manifest.length === 0) {
            console.error('❌ Manifest JSON is empty or invalid');
            process.exit(1);
        }
        const { id, version } = manifest[0];
        if (!id || !version) {
            console.error('❌ Manifest must include id and version');
            process.exit(1);
        }
        return { id, version };
    } catch (err) {
        console.error(`❌ Error processing manifest.json: ${err.message}`);
        process.exit(1);
    }
}

function createArchive(outputFolder, id, version) {
    const archivePath = path.join(__dirname, '..', 'build', `${id}-${version}.dsm`);
    console.log(`🚀 Saving archive to: ${archivePath}`);
    zl.archiveFolder(outputFolder, archivePath, {
        filter: (file) => true // include all files
    }).then(
        () => console.log('✅ Done archiving!'),
        (err) => {
            console.error(`❌ Error archiving: ${err.message}`);
            process.exit(1);
        }
    );
}

const folder = checkFolderArgument();
const outputFolder = path.join(__dirname, 'output', folder);
const manifestPath = checkManifestExists(outputFolder);
const { id, version } = readAndParseManifest(manifestPath);
createArchive(outputFolder, id, version);
