import fs from 'fs';
import path from 'path';

import { SUPPORTED_YEARS, JUNIOR_SUPPORTED_YEARS } from '../src/data/data';
import * as countriesIndex from '../src/data/countries';

const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const writeJson = (filePath: string, data: unknown) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
};

const main = async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const outputDir = path.resolve(projectRoot, 'public', 'data', 'countries');

  ensureDir(outputDir);

  const writtenFiles: string[] = [];

  // ESC years
  for (const year of SUPPORTED_YEARS) {
    const exportName = `COUNTRIES_${year}` as const;
    const countries = (countriesIndex as Record<string, unknown>)[exportName];

    if (!Array.isArray(countries)) {
      // eslint-disable-next-line no-console
      console.warn(`Warn: export ${exportName} not found or not an array; skipping`);
      continue;
    }

    const fileName = `countries-${year}.json`;
    const filePath = path.join(outputDir, fileName);
    writeJson(filePath, countries);
    writtenFiles.push(fileName);
  }

  // JESC years
  for (const year of JUNIOR_SUPPORTED_YEARS) {
    const exportName = `JUNIOR_COUNTRIES_${year}` as const;
    const countries = (countriesIndex as Record<string, unknown>)[exportName];

    if (!Array.isArray(countries)) {
      // eslint-disable-next-line no-console
      console.warn(`Warn: export ${exportName} not found or not an array; skipping`);
      continue;
    }

    const fileName = `junior-countries-${year}.json`;
    const filePath = path.join(outputDir, fileName);
    writeJson(filePath, countries);
    writtenFiles.push(fileName);
  }

  // eslint-disable-next-line no-console
  console.log(`Generated ${writtenFiles.length} files in ${path.relative(projectRoot, outputDir)}:`);
  for (const f of writtenFiles) {
    // eslint-disable-next-line no-console
    console.log(` - ${f}`);
  }
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
