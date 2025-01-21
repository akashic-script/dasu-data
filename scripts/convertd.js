const fs = require('fs-extra');
const Papa = require('papaparse');
const path = require('path');
const { afflictions, archetypes, subtypes, roles, tactics, weapons, spells, restoratives, techniques } = require('../index'); // Use pre-imported data

const importDir = path.join(__dirname, 'input');
const exportDir = path.join(__dirname, 'output');

fs.ensureDirSync(exportDir);

// Function to generate a random ID
export function generateID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 20; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Function to convert array of objects into an object indexed by 'id'
const createLookup = (data, key) => {
    if (!data || !Array.isArray(data)) {
        console.error(`Error: Data for ${key} is either missing or not an array.`);
        return {};  // Return an empty object if the data is invalid
    }

    return data.reduce((lookup, item) => {
        if (item.id) {  // Ensure the item has an 'id' before adding it to the lookup
            lookup[item.id] = item;
        } else {
            console.warn(`Item missing 'id' in ${key}:`, item);
        }
        return lookup;
    }, {});
};

// Function to populate missing fields from the pre-imported data
const populateFromLookup = (key, item, lookup) => {
    const data = lookup[key];
    if (!data) {
        console.warn(`No data found in lookup for ${key}`);
        return;
    }

    const itemData = data[item.id];

    if (itemData) {
        // Populate missing fields if found in the lookup
        Object.assign(item, itemData);
        console.log(`Populated ${key} with ID: ${item.id}`);
    } else {
        console.warn(`No matching item found for ${key} with ID: ${item.id}`);
        item.name = item.name || 'Unknown'; // Fallback to a default name
        item.description = item.description || 'No description available.'; // Add a fallback for description
    }
};

// Function to process each CSV row and map it to daemon structure
const processRow = (row, lookup) => {
    console.log("Processing row:", row); // Log the CSV row

    const newDaemon = {
        id: generateID(),
        dsid: row.id || '',
        publishId: '',
        name: row.name || 'Cyrus',
        level: parseInt(row.level) || 1,
        merit: parseInt(row.merit) || 0,
        archetypes: {  // Handle archetypes as an object
            id: row.archetype || '',
            name: '',
            category: 'archetype',
            description: '',
            benefits: ''
        },
        subtypes: {  // Handle subtypes as an object
            id: row.subtype || '',
            name: '',
            category: 'subtype',
            description: ''
        },
        roles: row.role ? row.role.split(',').map(role => ({ id: role.trim(), name: '', category: 'role', description: '' })) : [],
        attributes: ['str', 'int', 'dex', 'will', 'sta'].reduce((acc, attr) => {
            acc[attr] = { base: parseInt(row[attr]) || 3, mod: parseInt(row[`${attr}.mod`]) || 0 };
            return acc;
        }, {}),
        stats: ['hp', 'wp', 'avoid', 'def', 'toHit', 'toLand'].reduce((acc, stat) => {
            acc[stat] = { mod: parseInt(row[`${stat}.mod`]) || 0 };
            return acc;
        }, {}),
        aptitudes: {},
        resistances: { p: 'normal', f: 'normal', i: 'normal', el: 'normal', w: 'normal', ea: 'normal', l: 'normal', d: 'normal' },
        weapons: row.weapons ? row.weapons.split(',').map(weapon => ({ id: weapon.trim(), name: '', category: 'weapon', range: '', damage: 0, toHit: 0, cost: 0, tags: [], description: '' })) : [],
        abilities: {
            spells: row.spells ? row.spells.split(',').map(item => ({ id: item.trim(), name: '', category: 'spell', description: null, aptitudes: {} })) : [],
            afflictions: row.afflictions ? row.afflictions.split(',').map(item => ({ id: item.trim(), name: '', category: 'affliction', description: null, aptitudes: {} })) : [],
            restoratives: row.restoratives ? row.restoratives.split(',').map(item => ({ id: item.trim(), name: '', category: 'restorative', description: null, aptitudes: {} })) : [],
            techniques: row.techniques ? row.techniques.split(',').map(item => ({ id: item.trim(), name: '', category: 'technique', description: null, aptitudes: {} })) : []
        },
        tactics: row.tactics ? row.tactics.split(',').map(tactic => ({ id: tactic.trim(), name: '', category: 'tactic', govern: 'int', damage: 0, toLand: 0, isInfinity: false, cost: 0, description: '' })) : [],
        special: {
            abilities: row['special.id'] && row['special.name'] && row['special.cost'] ? [{
                id: row['special.id'],
                name: row['special.name'],
                category: 'specialability',
                description: row['special.effect'],
                cost: row['special.cost']
            }] : [],
            transformations: row['transform.id'] && row['transform.name'] && row['transform.merit'] ? [{
                id: row['transform.id'],
                name: row['transform.name'],
                category: 'transformation',
                cost: row['transform.merit']
            }] : []
        },
    };

    // Process resistances
    const elementMap = { fire: 'f', ice: 'i', electric: 'el', wind: 'w', earth: 'ea', light: 'l', dark: 'd', physical: 'p' };
    const resistanceTypes = ['weak', 'resist', 'nullify', 'drain'];

    resistanceTypes.forEach(type => {
        if (row[type]) {
            row[type].split(',').map(el => el.trim()).forEach(element => {
                const shortCode = elementMap[element.toLowerCase()];
                if (shortCode) newDaemon.resistances[shortCode] = type;
            });
        }
    });

    // Process aptitudes
    if (row.aptitude) {
        row.aptitude.split(',').map(apt => apt.trim()).forEach(apt => {
            const [key, value] = apt.split('-').map(part => part.trim());
            if (key && value && parseInt(value) >= 0) newDaemon.aptitudes[key.toLowerCase()] = parseInt(value);
        });
    }

    // Populate data from the lookup
    const populateField = (key) => {
        // Check if it's an array (like 'roles' or 'abilities.spells')
        if (Array.isArray(newDaemon[key])) {
            newDaemon[key].forEach(item => populateFromLookup(key, item, lookup));
        } else {
            // If it's not an array (like 'archetypes' or 'subtypes')
            populateFromLookup(key, newDaemon[key], lookup);
        }
    };

    // Special treatment for abilities fields inside abilities object (spells, afflictions, etc.)
    ['spells', 'afflictions', 'restoratives', 'techniques'].forEach(type => {
        newDaemon.abilities[type].forEach(item => populateFromLookup(type, item, lookup));
    });

    // Populate other fields as well
    ['archetypes', 'subtypes', 'roles', 'weapons', 'tactics'].forEach(populateField);

    console.log("Processed daemon:", newDaemon); // Log the final object
    return newDaemon;
};

// Function to process CSV files and map them to JSON
fs.readdir(importDir, (err, files) => {
    if (err) return console.error("Error reading directory:", err);

    // Filter for 'daemon.csv' and process it
    files.filter(file => file === 'daemon.csv').forEach(file => {
        const csvFilePath = path.join(importDir, file);
        const jsonFilePath = path.join(exportDir, file.replace('.csv', '.json'));

        fs.readFile(csvFilePath, 'utf8', (err, data) => {
            if (err) return console.error(`Error reading file ${file}:`, err);

            // Parse CSV data
            Papa.parse(data, {
                header: true,
                skipEmptyLines: true,
                complete: result => {
                    // Create lookups for each data type
                    const lookup = {
                        afflictions: createLookup(afflictions),
                        archetypes: createLookup(archetypes),
                        subtypes: createLookup(subtypes),
                        roles: createLookup(roles),
                        tactics: createLookup(tactics),
                        weapons: createLookup(weapons),
                        spells: createLookup(spells),
                        restoratives: createLookup(restoratives),
                        techniques: createLookup(techniques)
                    };

                    const processedData = result.data.map(row => processRow(row, lookup));

                    // Write to JSON file
                    fs.writeJson(jsonFilePath, processedData, { spaces: 2 }, err => {
                        if (err) console.error(`Error writing JSON for ${file}:`, err);
                    });
                },
                error: error => console.error(`Error parsing CSV file ${file}:`, error),
            });
        });
    });
});
