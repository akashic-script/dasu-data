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

// Function to process rows
const processRow = (row) => {
    Object.keys(row).forEach(key => row[key] = convertValue(row[key]));
    row = handleDotNotation(row);

    // Handle aptKey and aptValue
    if (row.aptKey === null && row.aptValue === null) {
        delete row.aptKey;
        delete row.aptValue;
        row.aptitudes = {};
    } else if (row.aptKey && row.aptValue) {
        row.aptitudes = { [row.aptKey]: row.aptValue };
        delete row.aptKey;
        delete row.aptValue;
    } else {
        delete row.aptKey;
        delete row.aptValue;
    }

    // Ensure description is set to null if empty
    if (!row.description) row.description = null;

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
