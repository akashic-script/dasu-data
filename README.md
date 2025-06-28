# Daemon Summoner Module (DSM) Builder

**IMPORTANT NOTE:** This repository contains scripts for processing data into DSM files for the Dasu project. Ensure you have the necessary environment variables configured before running the scripts. For support or issues, refer to the troubleshooting section or contact the project maintainers.

## About

This repository hosts a collection of Node.js scripts designed to automate the process of downloading, processing, validating, and building Daemon Summoner Module (DSM) files from CSV data sourced from Google Spreadsheets into JSON format for the Dasu project. A DSM is essentially a zip file that uses the `.dsm` extension, structured to store various data types including metadata, entities, and categorized game elements in JSON format.

## Overview

These scripts form a complete data pipeline, transforming raw CSV data into structured JSON files, validating their integrity, and packaging them into DSM archives for distribution. Each script serves a distinct role in this workflow, ensuring data consistency and compatibility with the Daemon Summoner system.

If you are looking to contribute or customize the data processing pipeline, this document provides detailed information on each script's purpose, usage, and configuration. For additional support, review the troubleshooting tips or reach out to the project community.

## Getting Started

To quickly set up and run the pipeline, follow the instructions in the [Running the Pipeline](#running-the-pipeline) section. For detailed configuration, refer to [Environment Variables](#environment-variables) and [Prerequisites](#prerequisites). Lastly, for item type schema, refer to [Item Type Syntax](#item-type-syntax).

## Script Details

The scripts are located in the `scripts/` directory and are designed to be executed via Node.js. Below is a comprehensive breakdown of each script, its purpose, and how to use it.

## 1. `download.js`

- **Purpose**: Downloads CSV files from a specified Google Spreadsheet.
- **Usage**: `node scripts/download.js <spreadsheet-name>`
- **Details**: Retrieves data for various sheets (e.g., manifest, daemons, archetypes) based on environment variables for spreadsheet IDs and names. The downloaded CSV files are saved in the `input/<spreadsheet-name>/` directory.

## 2. `convert.js`

- **Purpose**: Converts CSV files to JSON format with data processing.
- **Usage**: `node scripts/convert.js <folder-name>`
- **Details**: Reads CSV files from `input/<folder-name>/`, processes the data (e.g., converting values, handling dot notation), and writes the results as JSON to `output/<folder-name>/`. Excludes `daemons.csv` which is handled separately by `convertd.js`.

## 3. `validate.js`

- **Purpose**: Validates JSON files in a specified output folder.
- **Usage**: `node scripts/validate.js <folder-name>`
- **Details**: Checks all JSON files in `output/<folder-name>/` for valid JSON structure. Reports any parsing errors and stops the process if invalid files are found, ensuring data integrity before further processing.

## 4. `convertd.js`

- **Purpose**: Converts `daemons.csv` to JSON with extensive data validation and enrichment.
- **Usage**: `node scripts/convertd.js <folder-name>`
- **Details**: Processes `daemons.csv` from `input/<folder-name>/`, builds complex daemon objects with validation against predefined lookup data, and outputs the result to `output/<folder-name>/daemons.json`.

## 5. `build.js`

- **Purpose**: Builds an archive file from the processed output data.
- **Usage**: `node scripts/build.js <folder-name>`
- **Details**: Reads a manifest file from `output/<folder-name>/manifest.json` to determine the ID and version, then creates a `.dsm` archive of the folder contents in the `build/` directory.

## 6. `copy.js`

- **Purpose**: Copies processed data to specified destinations.
- **Usage**: `node scripts/copy.js`
- **Details**: Copies contents of `input/`, `output/`, and `build/` directories to locations defined in environment variables. Supports an overwrite option for the build directory via `OVERWRITE_DSM=true`.

## 7. `start.js`

- **Purpose**: Orchestrates the full data processing pipeline.
- **Usage**: `node scripts/start.js <spreadsheet-name>` or `node scripts/start.js all`
- **Details**: Runs the entire sequence of scripts (`download.js`, `convert.js`, `validate.js`, `convertd.js`, `build.js`, `copy.js`) for a given spreadsheet name, automating the complete workflow from data retrieval to distribution. Using `all` as the argument will process all valid spreadsheets defined in the .env file.

## Configuration

## Environment Variables

The scripts rely on environment variables defined in a `.env` file for configuration. Below are the key variables used:

| Variable Name            | Description                                                  |
|--------------------------|--------------------------------------------------------------|
| `SPREADNAME_OPTION1` to `SPREADNAME_OPTION5` | Define spreadsheet names for selection in `download.js` and `start.js`. |
| `SPREADSHEET_OPTION1` to `SPREADSHEET_OPTION5` | Define spreadsheet IDs corresponding to the names above. |
| `CPY_CSV_LOCATION`       | Destination path for copying CSV input files.               |
| `CPY_JSON_LOCATION`      | Destination path for copying JSON output files.             |
| `CPY_DSM_LOCATION`       | Destination path for copying DSM build files.               |
| `OVERWRITE_DSM`          | Boolean flag (`true`/`false`) to enable overwriting in `copy.js` for the DSM build directory. |

A template for setting up your `.env` file is provided in `.env.example`. Copy this file to `.env` and fill in your specific values.

## Prerequisites

Before running the scripts, ensure the following are in place:

- **Node.js**: Installed on your system to execute the scripts.
- **Dependencies**: Install required Node.js packages using `npm install`. Key dependencies include `axios`, `fs-extra`, `papaparse`, and `zip-lib`.
- **Environment Setup**: A `.env` file with necessary variables for spreadsheet access and file destinations must be created in the root directory.

## Running the Pipeline

To process data for a specific spreadsheet, follow these steps:

1. Ensure environment variables are set in your `.env` file.
2. Execute the full pipeline with `node scripts/start.js <spreadsheet-name>` to automate the process from download to copy.

Alternatively, you can run individual scripts for specific steps in the process if manual control is needed. Refer to the [Script Details](#script-details) section for individual script usage.

## Output Structure

The scripts generate files in the following directory structure:

- **`input/<folder-name>/`**: Contains downloaded CSV files from the specified spreadsheet.
- **`output/<folder-name>/`**: Contains processed JSON files after conversion and validation.
- **`build/`**: Contains the final `.dsm` archive files ready for distribution.

## Item Type Syntax

Below is the proper JSON syntax for each item type processed by these scripts. These structures are used in the output JSON files and are validated against predefined schemas where applicable.

## Manifest (manifest.json)

Defines the metadata for a module, necessary for the webapp to process the DSM file.

```json
{
  "id": string,
  "name": string,
  "author"?: string,
  "version"?: string,
  "description"?: string,
  "image_url"?: string,
  "website"?: string
}
```

## Daemon (daemons.json)

Represents a summonable entity.

```json
{
  "id": string,
  "dsid": string,
  "publishId": string,
  "type": string,
  "name": string,
  "image": {
    "src": string,
    "credit"?: string,
    "crop"?: {
      "x": number,
      "y": number
    },
    "zoom"?: number,
    "croppedAreaPixels"?: {
      "x": number,
      "y": number,
      "width": number,
      "height": number
    }
  },
  "level": number,
  "merit": number,
  "origin"?: string[],
  "archetypes": {
    "id"?: string,
    "name"?: string,
    "category"?: string,
    "description"?: string,
    "benefits"?: string
  },
  "subtypes": {
    "id"?: string,
    "name"?: string,
    "category"?: string,
    "description"?: string,
    "benefits"?: string
  },
  "roles": Array<{
    "id"?: string,
    "name"?: string,
    "category"?: string,
    "description"?: string
  }>,
  "attributes": {
    "pow": { "base": number, "mod": number },
    "dex": { "base": number, "mod": number },
    "will": { "base": number, "mod": number },
    "sta": { "base": number, "mod": number }
  },
  "stats": {
    "hp": { "mod": number, "multiplier": number },
    "wp": { "mod": number, "multiplier": number },
    "avoid": { "mod": number, "multiplier": number },
    "def": { "mod": number, "multiplier": number },
    "toHit": { "mod": number, "multiplier": number },
    "toLand": { "mod": number, "multiplier": number },
    "willStrain": { "mod": number, "multiplier": number }
  },
  "attributePoints"?: {
    "pow": number,
    "dex": number,
    "will": number,
    "sta": number
  },
  "aptitudes": {
    "f": number, "i": number, "el": number, "w": number, "ea": number, "l": number, "d": number,
    "dp": number, "dm": number, "da": number, "h": number, "tb": number, "tt": number,
    "tg": number, "ta": number, "assist": number
  },
  "resistances": {
    "p": string, "f": string, "i": string, "el": string,
    "w": string, "ea": string, "l": string, "d": string
  },
  "weapons"?: Array<{ "id": string, "category": string }>,
  "items"?: Array<{ "id": string, "category": string }>,
  "abilities"?: {
    "spells": Array<{ "id": string, "category": string }>,
    "afflictions": Array<{ "id": string, "category": string }>,
    "restoratives": Array<{ "id": string, "category": string }>,
    "techniques": Array<{ "id": string, "category": string }>
  },
  "tactics"?: Array<{ "id": string, "category": string }>,
  "statuses"?: Array<{ "id": string, "category": string }>,
  "special"?: {
    "abilities"?: Array<{
      "id": string,
      "name": string,
      "category"?: string,
      "description"?: string,
      "enabled"?: boolean
    }>,
    "transformations"?: Array<{
      "id": string,
      "name": string,
      "category"?: string,
      "cost": number,
      "description"?: string,
      "enabled"?: boolean
    }>
  }
}
```

## Archetype (archetype.json)

Classifies daemons into broad categories based on their primary nature or theme.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "description"?: string,
  "benefits"?: string
}
```

## Subtype (subtype.json)

Provides a more specific classification of daemons, subtype typically indicating their stage in development.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "description"?: string,
  "benefits"?: string
}
```

## Role (role.json)

Specifies a daemon's primary function or strategy in combat or other interactions.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "description"?: string
}
```

## Item (item.json)

Represents objects that can be used for various effects or benefits.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "cost": number,
  "quantity": number,
  "description"?: string
}
```

## Weapon (weapon.json)

Equipment designed for entities to use to perform attacks.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "range": string,
  "damage": { "value": number, "type": string },
  "toHit": number,
  "cost": number,
  "tags": Array<{ "id": string, "name": string, "category": string, "cost": number, "maxRank": number, "description"?: string }>,
  "description"?: string
}
```

## Tag (tag.json)

A slotable upgrade that can be attached to a weapon to provide additional effects or enhancements.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "cost": number,
  "maxRank": number,
  "description"?: string
}
```

## Spell (spell.json)

Magical abilities that actors can cast to produce elemental attacks.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "damage": { "value": number, "type": string },
  "cost": number,
  "toHit": number,
  "aptitudes"?: {
    "f": number, "i": number, "el": number, "w": number, "ea": number, "l": number, "d": number,
    "dp": number, "dm": number, "da": number, "h": number, "tb": number, "tt": number,
    "tg": number, "ta": number, "assist": number
  },
  "description"?: string
}
```

## Affliction (affliction.json)

Abilities that can apply status conditions to targets, either debuffs and buffs.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "cost": number,
  "toHit": number,
  "isInfinity": boolean,
  "aptitudes"?: {
    "f": number, "i": number, "el": number, "w": number, "ea": number, "l": number, "d": number,
    "dp": number, "dm": number, "da": number, "h": number, "tb": number, "tt": number,
    "tg": number, "ta": number, "assist": number
  },
  "description"?: string
}
```

## Restorative (restorative.json)

Abilities that provide healing or other beneficial effects to restore or enhance entities.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "heal": { "attribute": string, "value": number, "isFlat": boolean, "isPercent": boolean },
  "cost": number,
  "aptitudes"?: {
    "f": number, "i": number, "el": number, "w": number, "ea": number, "l": number, "d": number,
    "dp": number, "dm": number, "da": number, "h": number, "tb": number, "tt": number,
    "tg": number, "ta": number, "assist": number
  },
  "description"?: string
}
```

## Technique (technique.json)

Special non-magical abilities, always physical, unless altered through other means.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "damage": { "value": number, "type": string },
  "cost": number,
  "toHit": number,
  "aptitudes"?: {
    "f": number, "i": number, "el": number, "w": number, "ea": number, "l": number, "d": number,
    "dp": number, "dm": number, "da": number, "h": number, "tb": number, "tt": number,
    "tg": number, "ta": number, "assist": number
  },
  "description"?: string
}
```

## Tactic (tactic.json)

In contrast to Abilities, can be used for Negotiation.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "govern": string,
  "damage": { "value": number, "type": string },
  "toLand": number,
  "isInfinity": boolean,
  "cost": number,
  "description"?: string
}
```

## Status (status.json)

Temporary or permanent conditions affecting entities.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "description"?: string,
  "isNegotiation": boolean
}
```

## Special Ability (special-ability.json)

Unique abilities not covered by abilities or tactics. Exclusive to daemons, and not meant to operate outside the general rules.

```json
{
  "id": string,
  "name": string,
  "category"?: string,
  "description"?: string
}
```

## Transformation (transformation.json)

Alternate forms or higher states of being for daemons to transform into.

```json
{
  "id": string,
  "name": string,
  "category"?: string,
  "cost": number,
  "description"?: string
}
```

## Scar (scar.json)

Permanent effects or marks for summoners.

```json
{
  "name": string,
  "category"?: string,
  "description"?: string
}
```

## Arbitration (arbitration.json)

Actions to perform for the Arbitration encounters.

```json
{
  "id": string,
  "name": string,
  "category": string,
  "description"?: string,
  "effect"?: string
}
```

These structures ensure consistency and compatibility with the Daemon Summoner system, providing a standardized format for all data processed by these scripts.

## Troubleshooting

Common issues and their solutions are listed below. If you encounter problems not covered here, review the console output for detailed error messages.

- **Permission Errors**: If `copy.js` fails with permission issues, set `OVERWRITE_DSM=true` in your `.env` file to overwrite existing files in the destination directory.
- **Missing Data**: Ensure environment variables for spreadsheet IDs are correctly set and accessible in your `.env` file.
- **Validation Failures**: If `validate.js` reports issues, check JSON files in `output/` for syntax errors or structural inconsistencies.

For further assistance or to report bugs, consider reaching out to the project maintainers or community for support.
