const fs = require('fs-extra');   // File system module (fs-extra provides extra utilities)
const Papa = require('papaparse'); // CSV parsing library
const path = require('path');      // Path module for file paths

// Define input and export directories
const importDir = path.join(__dirname, 'input');
const exportDir = path.join(__dirname, 'output');


// Function to handle data type conversion
const convertValue = (value) => {
    if (value === '') return null;
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    return isNaN(value) ? value : parseFloat(value);
};

// Function to handle dot notation in headers and convert them into nested objects
const handleDotNotation = (row) => {
    return Object.keys(row).reduce((newRow, key) => {
        const value = row[key];
        key.split('.').reduce((acc, part, idx, arr) => {  // Split the key by dot notation
            if (idx === arr.length - 1) acc[part] = value; // Set the final key value
            else acc[part] = acc[part] || {}; // Create nested object if it doesn't exist
            return acc[part];  // Move deeper into the nested structure
        }, newRow);
        return newRow;
    }, {});
};

// Ensure the export directory exists
fs.ensureDirSync(exportDir);

const defaultAptitudes = {
    f: 0,
    i: 0,
    el: 0,
    w: 0,
    ea: 0,
    l: 0,
    d: 0,
    dp: 0,
    dm: 0,
    da: 0,
    h: 0,
    tb: 0,
    tt: 0,
    tg: 0,
    ta: 0,
    assist: 0
};

// Function to process rows
const processRow = (row) => {
    Object.keys(row).forEach(key => row[key] = convertValue(row[key]));
    row = handleDotNotation(row);

    // Handle tags
    if (row.hasOwnProperty("tags") && Array.isArray(row.tags)) {
        row.tags = row.tags.filter(tag =>
            tag &&
            typeof tag.id === 'string'
        );
    } else {
        delete row.tags;
    }

    // Handle aptitudes
    if (row.hasOwnProperty("aptitudes")) {
        let aptitudeData = {};

        if (row.aptitudes === null || row.aptitudes === '') {
            aptitudeData = {};
        } else if (typeof row.aptitudes === 'string' && row.aptitudes.includes('-')) {
            const [aptKey, aptValue] = row.aptitudes.split('-');
            aptitudeData[aptKey.toLowerCase()] = parseInt(aptValue, 10);
        }

        row.aptitudes = { ...defaultAptitudes, ...aptitudeData };
    }

    // Handle damage (from separate fields: damage + type)
    if ('damage' in row || 'type' in row) {
        const value = parseInt(row.damage, 10);
        const type = row.type || 'unknown';

        row.damage = {
            value: isNaN(value) ? 0 : value,
            type: type
        };

        delete row.type;
    }

    if (!row.description) row.description = "";

    return row;
};


// Read and process CSV files
fs.readdir(importDir, (err, files) => {
    if (err) return console.error("Error reading directory:", err);

    // Filter CSV files and process each
    files.filter(file => file.endsWith('.csv') && file !== 'daemon.csv').forEach(file => {
        const csvFilePath = path.join(importDir, file);
        const jsonFilePath = path.join(exportDir, file.replace('.csv', '.json'));

        // Read CSV file
        fs.readFile(csvFilePath, 'utf8', (err, data) => {
            if (err) return console.error(`Error reading file ${file}:`, err);

            // Parse CSV data
            Papa.parse(data, {
                header: true,
                skipEmptyLines: true,
                complete: result => {
                    const processedData = result.data.map(processRow);

                    fs.writeJson(jsonFilePath, processedData, { spaces: 2 }, err => {
                        if (err) return console.error(`Error writing JSON for ${file}:`, err);
                        console.log(`Successfully converted ${file} to JSON`);
                    });
                },
                error: error => console.error(`Error parsing CSV file ${file}:`, error),
            });
        });
    });
});
