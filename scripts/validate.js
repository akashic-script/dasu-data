const fs = require('fs');
const path = require('path');

function checkFolderArgument() {
    const folder = process.argv[2];
    if (!folder) {
        console.error('❌ Error: Missing folder argument.');
        console.error('Usage: npm run validate <folder>');
        process.exit(1);
    }
    return folder;
}

function validateJsonFiles(folder) {
    const outputDir = path.resolve(__dirname, "output", folder);
    let isValid = true;

    try {
        const files = fs.readdirSync(outputDir);
        console.log(`Validating JSON files in ${outputDir}`);

        files.forEach(filename => {
            if (path.extname(filename).toLowerCase() !== '.json') return;

            const filePath = path.join(outputDir, filename);
            try {
                const contents = fs.readFileSync(filePath, 'utf-8');
                JSON.parse(contents);
                console.log(`✅ Valid JSON: ${filename}`);
            } catch (e) {
                console.error(`❌ Invalid JSON in ${filename}: ${e.message}`);
                isValid = false;
            }
        });
    } catch (e) {
        console.error(`❌ Error reading directory ${outputDir}: ${e.message}`);
        process.exit(1);
    }

    return isValid;
}

const folder = checkFolderArgument();
const isValid = validateJsonFiles(folder);

if (!isValid) {
    console.error('❌ One or more JSON files are invalid. Stopping the process.');
    process.exit(1);
} else {
    console.log('✅ All JSON files are valid.');
}
