const fs = require('fs-extra');   // File system module (fs-extra provides extra utilities)
const Papa = require('papaparse'); // CSV parsing library
const path = require('path');      // Path module for file paths

// Define input and export directories
const importDir = path.join(__dirname, 'input'); // Input folder for CSV files
const exportDir = path.join(__dirname, 'output'); // Parent directory 'lib' folder
// const exportDir = path.join(__dirname, '..', 'lib');

// Function to automatically convert data types
function convertValue(value) {
    if (value === '') return null; // Empty string can be treated as null (optional)

    // Convert "true" or "false" to boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Convert values that start with a number to numeric values
    if (!isNaN(value) && !isNaN(parseFloat(value))) {
        return parseFloat(value); // This will convert strings like "123" or "45.67" to numbers
    }

    // Otherwise, return as a string (no conversion)
    return value;
}

// Function to handle dot notation in headers and convert them into nested objects
function handleDotNotation(row) {
    const newRow = {};

    Object.keys(row).forEach(key => {
        const value = row[key];
        const keys = key.split('.'); // Split the key by dot notation

        keys.reduce((acc, part, index) => {
            if (index === keys.length - 1) {
                acc[part] = value; // Set the final key value
            } else {
                if (!acc[part]) acc[part] = {}; // Create nested object if it doesn't exist
                return acc[part]; // Move deeper into the nested structure
            }
        }, newRow);
    });

    return newRow;
}

// Ensure the export directory exists
fs.ensureDirSync(exportDir);

// Process all CSV files in the input directory
fs.readdir(importDir, (err, files) => {
    if (err) return console.error("Error reading directory:", err);

    // Filter CSV files and process each
    files.filter(file => file.endsWith('.csv')).forEach(file => {
        const csvFilePath = path.join(importDir, file);
        const jsonFilePath = path.join(exportDir, file.replace('.csv', '.json'));

        // Read CSV file
        fs.readFile(csvFilePath, 'utf8', (err, data) => {
            if (err) return console.error(`Error reading file ${file}:`, err);

            // Parse CSV data and convert aptKey/aptValue to nested object
            Papa.parse(data, {
                header: true,
                skipEmptyLines: true,
                complete: result => {
                    // Transform data: Check for aptKey/aptValue and convert them
                    result.data = result.data.map(row => {
                        // Convert all values in the row based on their types
                        Object.keys(row).forEach(key => {
                            row[key] = convertValue(row[key]);
                        });

                        // Handle dot notation and create nested objects
                        row = handleDotNotation(row);

                        // If aptKey and aptValue exist, create a nested "aptitudes" object
                        if (row.aptKey && row.aptValue) {
                            row.aptitudes = {
                                [row.aptKey]: row.aptValue,
                            };
                            // Remove original aptKey and aptValue
                            delete row.aptKey;
                            delete row.aptValue;
                        }

                        // If "description" is missing or empty, set it as null
                        if (!row.description) {
                            row.description = null;
                        }

                        return row;
                    });

                    // Write the modified data to JSON file
                    fs.writeJson(jsonFilePath, result.data, { spaces: 2 }, err => {
                        if (err) return console.error(`Error writing JSON for ${file}:`, err);
                        console.log(`Successfully converted ${file} to JSON`);
                    });
                },
                error: error => console.error(`Error parsing CSV file ${file}:`, error),
            });
        });
    });
});
