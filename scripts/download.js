const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function getInputName() {
    const arg = process.argv[2];
    if (arg) return arg;
    if (process.env.npm_config_argv) {
        try {
            const argv = JSON.parse(process.env.npm_config_argv).original;
            return argv[1];
        } catch {
            return null;
        }
    }
    return null;
}

function validateInputName(inputName) {
    if (!inputName) {
        console.error('❌ Missing spreadsheet name (e.g. "base")');
        process.exit(1);
    }
    return inputName;
}

function selectSpreadsheet(inputName) {
    const options = Array.from({ length: 5 }, (_, i) => {
        const idx = i + 1;
        return {
            name: process.env[`SPREADNAME_OPTION${idx}`],
            id: process.env[`SPREADSHEET_OPTION${idx}`]
        };
    });
    const selected = options.find(opt => opt.name?.toLowerCase() === inputName.toLowerCase());
    if (!selected || !selected.id) {
        console.error(`❌ Could not find spreadsheet for "${inputName}"`);
        process.exit(1);
    }
    return selected;
}

async function downloadSheets(spreadsheetId, spreadsheetName) {
    const baseDir = path.join(__dirname, 'input', spreadsheetName);
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    const sheetNames = [
        'manifest', 'daemons', 'archetypes', 'subtypes', 'roles',
        'items', 'weapons', 'tags', 'spells', 'afflictions',
        'restoratives', 'techniques', 'tactics', 'statuses',
        'specialabilities', 'transformations', 'scars', 'arbitrations'
    ];
    console.log(`🚀 Downloading sheets for "${spreadsheetName}"`);
    for (const sheetName of sheetNames) {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
        try {
            const response = await axios.get(url);
            const filePath = path.join(baseDir, `${sheetName}.csv`);
            if (fs.existsSync(filePath)) {
                console.log(`⚠️ Overwriting: ${sheetName}.csv`);
            } else {
                console.log(`✅ Writing: ${sheetName}.csv`);
            }
            fs.writeFileSync(filePath, response.data);
        } catch (error) {
            console.error(`❌ Failed to download ${sheetName}: ${error.message}`);
        }
    }
    console.log(`✅ Download complete for "${spreadsheetName}"`);
}

const inputName = validateInputName(getInputName());
const selected = selectSpreadsheet(inputName);
downloadSheets(selected.id, selected.name);
