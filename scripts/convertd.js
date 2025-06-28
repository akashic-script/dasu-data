const fs = require('fs-extra');
const path = require('path');
const Papa = require('papaparse');

const {
    afflictions,
    archetypes,
    subtypes,
    roles,
    tactics,
    weapons,
    spells,
    restoratives,
    techniques,
} = require('../index');

function checkFolderArgument() {
    const folder = process.argv[2];
    if (!folder) {
        console.error("❌ Error: Missing required folder argument.");
        process.exit(1);
    }
    return folder;
}

function setupDirectories(folder) {
    const importDir = path.join(__dirname, 'input', folder);
    const exportDir = path.join(__dirname, 'output', folder);
    fs.ensureDirSync(exportDir);
    return { importDir, exportDir };
}

function generateID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 20; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function createLookup(data) {
    if (!Array.isArray(data)) return {};
    return data.reduce((acc, item) => {
        if (item.id) acc[item.id] = item;
        return acc;
    }, {});
}

function populateFromLookup(category, item, lookups) {
    if (!item || !item.id) return;
    const data = lookups[category]?.[item.id];
    if (!data) {
        item.name ||= 'Unknown';
        item.description ||= '';
        return;
    }
    Object.entries(data).forEach(([key, val]) => {
        if (item[key] === undefined || item[key] === '') {
            item[key] = val;
        }
    });
}

function parseNumber(val, fallback = 0) {
    if (val === undefined || val === null || val === '') return fallback;
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
}

function parseString(val, fallback = '') {
    if (val === undefined || val === null) return fallback;
    return String(val);
}

function validateDaemon(daemon, lookups) {
    const errors = [];
    if (!daemon.id || daemon.id === '') errors.push('Missing ID');
    if (!daemon.name || daemon.name === '') errors.push('Missing name');
    if (!daemon.archetypes?.id || daemon.archetypes.id === '') {
        errors.push('Missing archetype ID (optional)');
    } else if (!lookups.archetypes[daemon.archetypes.id]) {
        errors.push(`Archetype ID "${daemon.archetypes.id}" not found`);
    }
    if (!daemon.subtypes?.id || daemon.subtypes.id === '') {
        errors.push('Missing subtype ID');
    } else if (!lookups.subtypes[daemon.subtypes.id]) {
        errors.push(`Subtype ID "${daemon.subtypes.id}" not found`);
    }
    if (typeof daemon.level !== 'number' || daemon.level < 1) {
        errors.push('Level must be a positive integer ≥ 1');
    }
    if (typeof daemon.merit !== 'number' || daemon.merit < 0) {
        errors.push('Merit must be a non-negative integer');
    }
    daemon.roles.forEach((role) => {
        if (!lookups.roles[role.id]) {
            errors.push(`Role ID "${role.id}" not found`);
        }
    });
    daemon.weapons.forEach((weapon) => {
        if (!lookups.weapons[weapon.id]) {
            errors.push(`Weapon ID "${weapon.id}" not found`);
        }
    });
    daemon.tactics.forEach((tactic) => {
        if (!lookups.tactics[tactic.id]) {
            errors.push(`Tactic ID "${tactic.id}" not found`);
        }
    });
    ['spells', 'afflictions', 'restoratives', 'techniques'].forEach((type) => {
        daemon.abilities[type].forEach((ability) => {
            if (!lookups[type][ability.id]) {
                errors.push(`${type.slice(0, -1).charAt(0).toUpperCase() + type.slice(1, -1)} ID "${ability.id}" not found`);
            }
        });
    });
    Object.entries(daemon.attributes).forEach(([attr, val]) => {
        if (val.base < 1 || val.base > 10) {
            errors.push(`Attribute ${attr} base value (${val.base}) out of range (1-10)`);
        }
    });
    const validResistances = ['normal', 'weak', 'resist', 'nullify', 'drain'];
    Object.entries(daemon.resistances).forEach(([key, val]) => {
        if (!validResistances.includes(val)) {
            errors.push(`Resistance ${key} has invalid value "${val}"`);
        }
    });
    daemon.special.abilities.forEach((special) => {
        if (!special.id || !special.name || !special.cost) {
            errors.push('Special ability missing required fields (id, name, cost)');
        }
    });
    daemon.special.transformations.forEach((trans) => {
        if (!trans.id || !trans.name || !trans.cost) {
            errors.push('Transformation missing required fields (id, name, cost)');
        }
    });
    return errors;
}

function buildDaemonObject(row, lookups) {
    const daemon = {
        id: parseString(row.id) || generateID(),
        dsid: parseString(row.dsid) || parseString(row.id) || generateID(),
        type: 'daemon',
        publishId: '',
        name: parseString(row.name, 'Unknown'),
        image: {
            src: parseString(row['image.src']),
            credit: parseString(row['image.credit']),
        },
        level: parseNumber(row.level, 1),
        merit: parseNumber(row.merit, 0),
        archetypes: { id: parseString(row.archetype), category: 'archetype' },
        subtypes: { id: parseString(row.subtype), category: 'subtype' },
        roles: row.role ? row.role.split(',').map((r) => ({ id: r.trim(), category: 'role' })) : [],
        origin: row.origin ? row.origin.split(',').map((o) => o.trim()) : [],
        attributes: ['pow', 'dex', 'will', 'sta'].reduce((acc, a) => {
            acc[a] = {
                base: parseNumber(row[`${a}.base`], 3),
                mod: parseNumber(row[`${a}.mod`], 0),
            };
            return acc;
        }, {}),
        stats: ['hp', 'wp', 'avoid', 'def', 'toHit', 'toLand', 'willStrain'].reduce((acc, s) => {
            acc[s] = { 
                mod: parseNumber(row[`${s}.mod`], 0),
                multiplier: parseNumber(row[`${s}.multiplier`], 1)
            };
            return acc;
        }, {}),
        aptitudes: {
            f: parseNumber(row['apt.f']),
            i: parseNumber(row['apt.i']),
            el: parseNumber(row['apt.el']),
            w: parseNumber(row['apt.w']),
            ea: parseNumber(row['apt.ea']),
            l: parseNumber(row['apt.l']),
            d: parseNumber(row['apt.d']),
            dp: parseNumber(row['apt.dp']),
            dm: parseNumber(row['apt.dm']),
            da: parseNumber(row['apt.da']),
            h: parseNumber(row['apt.h']),
            tb: parseNumber(row['apt.tb']),
            tt: parseNumber(row['apt.tt']),
            tg: parseNumber(row['apt.tg']),
            ta: parseNumber(row['apt.ta']),
            assist: parseNumber(row['apt.assist']),
        },
        resistances: {
            p: parseString(row['res.p'], 'normal'),
            f: parseString(row['res.f'], 'normal'),
            i: parseString(row['res.i'], 'normal'),
            el: parseString(row['res.el'], 'normal'),
            w: parseString(row['res.w'], 'normal'),
            ea: parseString(row['res.ea'], 'normal'),
            l: parseString(row['res.l'], 'normal'),
            d: parseString(row['res.d'], 'normal'),
        },
        weapons: row.weapons ? row.weapons.split(',').map((w) => ({ id: w.trim(), category: 'weapon' })) : [],
        abilities: {
            spells: row.spells ? row.spells.split(',').map((s) => ({ id: s.trim(), category: 'spell' })) : [],
            afflictions: row.afflictions ? row.afflictions.split(',').map((a) => ({ id: a.trim(), category: 'affliction' })) : [],
            restoratives: row.restoratives ? row.restoratives.split(',').map((r) => ({ id: r.trim(), category: 'restorative' })) : [],
            techniques: row.techniques ? row.techniques.split(',').map((t) => ({ id: t.trim(), category: 'technique' })) : [],
        },
        tactics: row.tactics ? row.tactics.split(',').map((t) => ({ id: t.trim(), category: 'tactic' })) : [],
        special: {
            abilities: row['special.id'] && row['special.name'] && row['special.cost'] ? [{
                id: row['special.id'],
                name: row['special.name'],
                category: 'specialability',
                description: row['special.effect'] || '',
                cost: row['special.cost'],
            }] : [],
            transformations: row['transform.id'] && row['transform.name'] && row['transform.merit'] ? [{
                id: row['transform.id'],
                name: row['transform.name'],
                category: 'transformation',
                cost: row['transform.merit'],
            }] : [],
        },
    };
    return daemon;
}

function processRow(row, lookups) {
    const daemon = buildDaemonObject(row, lookups);
    const elementMap = {
        fire: 'f', ice: 'i', electric: 'el', wind: 'w', earth: 'ea', light: 'l', dark: 'd', physical: 'p',
    };
    ['weak', 'resist', 'nullify', 'drain'].forEach((type) => {
        if (row[type]) {
            row[type].split(',').map((e) => e.trim()).forEach((el) => {
                const short = elementMap[el.toLowerCase()];
                if (short) daemon.resistances[short] = type;
            });
        }
    });
    if (row.aptitude) {
        row.aptitude.split(',').map((apt) => apt.trim()).forEach((apt) => {
            const [key, val] = apt.split('-').map((x) => x.trim());
            if (key && val && !isNaN(parseInt(val))) {
                daemon.aptitudes[key.toLowerCase()] = parseInt(val);
            }
        });
    }
    const validationErrors = validateDaemon(daemon, lookups);
    if (validationErrors.length > 0) {
        console.warn(`⚠️ Validation errors for daemon "${daemon.name || 'Unknown'}" (ID: ${daemon.id || 'N/A'}): ${validationErrors.join(', ')}`);
    }
    const lookupFields = ['archetypes', 'subtypes', 'roles', 'weapons', 'tactics'];
    lookupFields.forEach((field) => {
        if (Array.isArray(daemon[field])) {
            daemon[field].forEach((item) => populateFromLookup(field, item, lookups));
        } else {
            populateFromLookup(field, daemon[field], lookups);
        }
    });
    ['spells', 'afflictions', 'restoratives', 'techniques'].forEach((type) => {
        daemon.abilities[type].forEach((item) => populateFromLookup(type, item, lookups));
    });
    return daemon;
}

function processDaemonsCsv(importDir, exportDir) {
    fs.readdir(importDir, (err, files) => {
        if (err) {
            console.error(`❌ Error reading import directory: ${err.message}`);
            return;
        }
        const daemonFile = files.find((f) => f === 'daemons.csv');
        if (!daemonFile) {
            console.error('❌ daemons.csv not found in input directory');
            return;
        }
        const csvPath = path.join(importDir, daemonFile);
        const jsonPath = path.join(exportDir, daemonFile.replace('.csv', '.json'));
        fs.readFile(csvPath, 'utf8', (err, data) => {
            if (err) {
                console.error(`❌ Error reading daemons.csv: ${err.message}`);
                return;
            }
            Papa.parse(data, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const lookups = {
                        afflictions: createLookup(afflictions),
                        archetypes: createLookup(archetypes),
                        subtypes: createLookup(subtypes),
                        roles: createLookup(roles),
                        tactics: createLookup(tactics),
                        weapons: createLookup(weapons),
                        spells: createLookup(spells),
                        restoratives: createLookup(restoratives),
                        techniques: createLookup(techniques),
                    };
                    const requiredLookups = ['afflictions', 'archetypes', 'subtypes', 'roles', 'tactics', 'weapons', 'spells', 'restoratives', 'techniques'];
                    const missingLookups = requiredLookups.filter(key => !lookups[key] || Object.keys(lookups[key]).length === 0);
                    if (missingLookups.length > 0) {
                        console.error(`❌ Missing required JSON lookup data for: ${missingLookups.join(', ')}. Cannot continue processing.`);
                        process.exit(1);
                    }
                    const processed = results.data.map((row) => processRow(row, lookups));
                    fs.writeJson(jsonPath, processed, { spaces: 2 }, (err) => {
                        if (err) console.error(`❌ Error writing daemon JSON: ${err.message}`);
                        else console.log(`✅ Daemon JSON generated at ${jsonPath}`);
                    });
                },
                error: (error) => console.error(`❌ CSV parse error: ${error.message}`),
            });
        });
    });
}

const folder = checkFolderArgument();
const { importDir, exportDir } = setupDirectories(folder);
processDaemonsCsv(importDir, exportDir);
