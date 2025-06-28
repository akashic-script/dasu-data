const { execSync } = require('child_process');
require('dotenv').config();

function getSpreadsheetName() {
    const inputName = process.argv[2];
    if (!inputName) {
        console.error('❌ Missing spreadsheet name argument (found in .env: SPREADNAME_OPTION=X)');
        process.exit(1);
    }
    return inputName;
}

function loadSpreadsheetOptions() {
    return Array.from({ length: 5 }, (_, i) => {
        const idx = i + 1;
        return {
            name: process.env[`SPREADNAME_OPTION${idx}`]?.trim(),
            id: process.env[`SPREADSHEET_OPTION${idx}`]?.trim()
        };
    });
}

function selectSpreadsheet(inputName, options) {
    if (inputName.toLowerCase() === 'all') {
        const validOptions = options.filter(opt => opt.name && opt.name.toLowerCase() !== 'all' && opt.id);
        if (validOptions.length === 0) {
            console.error('❌ No valid spreadsheets found in .env configuration');
            process.exit(1);
        }
        // Maintain order from 1 to x as defined in .env
        return validOptions.sort((a, b) => {
            const aIndex = options.findIndex(opt => opt.name === a.name);
            const bIndex = options.findIndex(opt => opt.name === b.name);
            return aIndex - bIndex;
        });
    }
    const selected = options.find(opt => opt.name && opt.name.toLowerCase() === inputName.toLowerCase());
    if (!selected) {
        console.error(`❌ No spreadsheet found matching name '${inputName}'`);
        console.log('Available names:');
        options.forEach(opt => opt.name && console.log(`- ${opt.name}`));
        process.exit(1);
    }
    if (!selected.id) {
        console.error(`❌ Spreadsheet ID missing for "${selected.name}"`);
        process.exit(1);
    }
    return selected;
}

function runCommand(cmd) {
    console.log(`\n> Running: ${cmd}`);
    try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(`✅ Completed: ${cmd}`);
    } catch (e) {
        console.error(`❌ Command failed: ${cmd}`);
        process.exit(1);
    }
}

function runPipeline(spreadsheetName) {
    console.log(`🚀 Running pipeline with spreadsheet "${spreadsheetName}"`);
    const scripts = [
        `node ./scripts/download.js "${spreadsheetName}"`,
        `node ./scripts/convert.js "${spreadsheetName}"`,
        `node ./scripts/validate.js "${spreadsheetName}"`,
        `node ./scripts/convertd.js "${spreadsheetName}"`,
        `node ./scripts/validate.js "${spreadsheetName}"`,
        `node ./scripts/build.js "${spreadsheetName}"`,
        'node ./scripts/copy.js'
    ];

    scripts.forEach(runCommand);
}

const inputName = getSpreadsheetName();
const options = loadSpreadsheetOptions();
const selected = selectSpreadsheet(inputName, options);

if (Array.isArray(selected)) {
    console.log('🚀 Running pipeline for all spreadsheets');
    selected.forEach(spreadsheet => {
        console.log(`\n📋 Processing spreadsheet: "${spreadsheet.name}"`);
        runPipeline(spreadsheet.name);
    });
    console.log('✅ All spreadsheets processed');
} else {
    runPipeline(selected.name);
}
