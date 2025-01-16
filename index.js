"use script"

const data = {
    afflictions: require("./scripts/output/afflictions.json"),
    arbitrations: require("./scripts/output/arbitrations.json"),
    manifest: require("./scripts/output/info.json"),
    items: require("./scripts/output/items.json"),
    restoratives: require("./scripts/output/restoratives.json"),
    scars: require("./scripts/output/scars.json"),
    specialabilities: require("./scripts/output/specialabilities.json"),
    spells: require("./scripts/output/spells.json"),
    statuses: require("./scripts/output/statuses.json"),
    tactics: require("./scripts/output/tactics.json"),
    tags: require("./scripts/output/tags.json"),
    techniques: require("./scripts/output/techniques.json"),
    transformations: require("./scripts/output/transformations.json"),
    weapons: require("./scripts/output/weapons.json"),
}

module.exports = data