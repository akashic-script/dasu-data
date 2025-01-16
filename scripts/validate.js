const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, './output');
const files = fs.readdirSync(outputDir);

let valid = true;

files.forEach(filename => {
    const filePath = path.join(outputDir, filename);
    const contents = fs.readFileSync(filePath, 'utf-8');
    
    try {
        JSON.parse(contents);
    } catch (e) {
        console.error(`Invalid JSON in ${filename}`);
        valid = false;
    }
});

if (!valid) {
    console.error('One or more JSON files are invalid. Stopping the process.');
    process.exit(1); // Exit with error if JSON is invalid
}
