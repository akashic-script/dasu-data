const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Insert your google sheet ID here
const SPREADSHEET_ID = '1TZ-sLBcWUnfy6JBSMKDb8UyUUN5HykMN-SG_WB4e2vg';

// Insert your sheet names here
const sheetNames = ['manifest', 'daemon', 'archetypes', 'subtypes', 'roles', 'items', 'weapons', 'tags', 'spells', 'afflictions', 'restoratives', 'techniques', 'tactics', 'statuses', 'specialabilities', 'transformations', 'scars', 'arbitrations'];

async function downloadSheets() {
    const inputDir = path.join(__dirname, '../scripts/input');

    // Create the directory if it doesn't exist
    if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
    }

    for (const sheetName of sheetNames) {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;

        try {
            const response = await axios.get(url);
            const csvData = response.data;

            // Save the CSV data to a file in the ./scripts/input folder
            const filePath = path.join(inputDir, `${sheetName}.csv`);
            fs.writeFileSync(filePath, csvData);

            console.log(`Saved ${sheetName}.csv to ./scripts/input/`);
        } catch (error) {
            console.error(`Failed to download ${sheetName}:`, error);
        }
    }
}

downloadSheets();