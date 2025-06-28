"use strict";

const fs = require("fs");
const path = require("path");

const folder = process.argv[2] || process.env.DEFAULT_OUTPUT_FOLDER;
const basePath = path.resolve(__dirname, "scripts", "output", folder);

function safeLoad(file) {
    const fullPath = path.join(basePath, file);
    if (fs.existsSync(fullPath)) {
        return require(fullPath);
    } else {
        console.warn(`Warning: Missing file ${fullPath}`);
        return undefined;
    }
}

const data = {
    archetypes: safeLoad("archetypes.json"),
    subtypes: safeLoad("subtypes.json"),
    roles: safeLoad("roles.json"),
    afflictions: safeLoad("afflictions.json"),
    arbitrations: safeLoad("arbitrations.json"),
    manifest: safeLoad("manifest.json"),
    items: safeLoad("items.json"),
    restoratives: safeLoad("restoratives.json"),
    scars: safeLoad("scars.json"),
    specialabilities: safeLoad("specialabilities.json"),
    spells: safeLoad("spells.json"),
    statuses: safeLoad("statuses.json"),
    tactics: safeLoad("tactics.json"),
    tags: safeLoad("tags.json"),
    techniques: safeLoad("techniques.json"),
    transformations: safeLoad("transformations.json"),
    weapons: safeLoad("weapons.json"),
    daemons: safeLoad("daemons.json"),
};

module.exports = data;
