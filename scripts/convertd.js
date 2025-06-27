const fs = require('fs-extra');
const Papa = require('papaparse');
const path = require('path');

const { afflictions, archetypes, subtypes, roles, tactics, weapons, spells, restoratives, techniques } = require('../index'); // Use pre-imported data

const importDir = path.join(__dirname, 'input');
const exportDir = path.join(__dirname, 'output');

fs.ensureDirSync(exportDir);

// Function to generate a random ID
function generateID() {
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
        item.name = item.name || 'Unknown';
        item.description = item.description || 'No description available.';
    }
};

// Function to process each CSV row and map it to daemon structure
const processRow = (row, lookup) => {
    const num = (val, fallback = 0) => (val === undefined || val === null || val === '' ? fallback : parseInt(val, 10) || fallback);
    const str = (val, fallback = '') => (val === undefined || val === null ? fallback : String(val));

    const newDaemon = {
        id: str(row.id) || generateID(),
        dsid: str(row.dsid) || str(row.id) || generateID(),
        publishId: '',
        type: 'daemon',
        name: str(row.name, 'Unknown'),
        image: { src: str(row['image.src']), credit: str(row['image.credit']) },
        level: num(row.level, 1),
        merit: num(row.merit, 0),
        archetypes: {
            id: str(row.archetype),
            name: str(row.archetype_name),
            category: 'archetype',
            description: '',
            benefits: ''
        },
        subtypes: {
            id: str(row.subtype),
            name: str(row.subtype_name),
            category: 'subtype',
            description: ''
        },
        roles: row.role ? row.role.split(',').map(role => ({ id: role.trim(), name: '', category: 'role', description: '' })) : [],
        origin: row.origin ? row.origin.split(',').map(item => item.trim()) : [],
        attributes: ['pow', 'dex', 'will', 'sta'].reduce((acc, attr) => {
            acc[attr] = { base: num(row[`${attr}.base`], 3), mod: num(row[`${attr}.mod`], 0) };
            return acc;
        }, {}),
        stats: ['hp', 'wp', 'avoid', 'def', 'toHit', 'toLand', 'willStrain'].reduce((acc, stat) => {
            acc[stat] = { mod: num(row[`${stat}.mod`], 0) };
            return acc;
        }, {}),
        aptitudes: {
            f: num(row['apt.f']),
            i: num(row['apt.i']),
            el: num(row['apt.el']),
            w: num(row['apt.w']),
            ea: num(row['apt.ea']),
            l: num(row['apt.l']),
            d: num(row['apt.d']),
            dp: num(row['apt.dp']),
            dm: num(row['apt.dm']),
            da: num(row['apt.da']),
            h: num(row['apt.h']),
            tb: num(row['apt.tb']),
            tt: num(row['apt.tt']),
            tg: num(row['apt.tg']),
            ta: num(row['apt.ta']),
            assist: num(row['apt.assist'])
        },
        resistances: {
            p: str(row['res.p'], 'normal'),
            f: str(row['res.f'], 'normal'),
            i: str(row['res.i'], 'normal'),
            el: str(row['res.el'], 'normal'),
            w: str(row['res.w'], 'normal'),
            ea: str(row['res.ea'], 'normal'),
            l: str(row['res.l'], 'normal'),
            d: str(row['res.d'], 'normal')
        },
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

    // Process resistances from columns like 'weak', 'resist', etc.
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

    // Process aptitudes from a single 'aptitude' column (e.g., "f-2, i-1")
    if (row.aptitude) {
        row.aptitude.split(',').map(apt => apt.trim()).forEach(apt => {
            const [key, value] = apt.split('-').map(part => part.trim());
            if (key && value && !isNaN(parseInt(value))) newDaemon.aptitudes[key.toLowerCase()] = parseInt(value);
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
    files.filter(file => file === 'daemons.csv').forEach(file => {
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
