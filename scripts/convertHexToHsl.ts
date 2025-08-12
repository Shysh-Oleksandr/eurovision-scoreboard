import fs from 'fs';
import path from 'path';

function expandShorthandHex(hex: string): string {
  const shorthandMatch = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
  const matched = hex.match(shorthandMatch);
  if (!matched) return hex;
  const [, r, g, b] = matched;
  return `#${r}${r}${g}${g}${b}${b}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const fullHex = expandShorthandHex(hex);
  const match = fullHex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!match) return null;
  const [, rHex, gHex, bHex] = match;
  return {
    r: parseInt(rHex, 16),
    g: parseInt(gHex, 16),
    b: parseInt(bHex, 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = 60 * (((gn - bn) / delta) % 6);
        break;
      case gn:
        h = 60 * ((bn - rn) / delta + 2);
        break;
      default:
        h = 60 * ((rn - gn) / delta + 4);
        break;
    }
  } else {
    s = 0;
    h = 0;
  }

  if (h < 0) h += 360;

  // Round values for cleanliness
  const hRound = Math.round(h);
  const sRound = Math.round(s * 100);
  const lRound = Math.round(l * 100);

  return { h: hRound, s: sRound, l: lRound };
}

function hexToHslString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex; // Fallback: leave as-is if not valid
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function convertHexColorsToHsl(content: string): { converted: string; replacements: number } {
  const hexRegex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  let count = 0;
  const converted = content.replace(hexRegex, (match) => {
    const hsl = hexToHslString(match);
    if (hsl !== match) count += 1;
    return hsl;
  });
  return { converted, replacements: count };
}

function parseArgs(argv: string[]) {
  const result = {
    write: false,
    file: path.resolve(process.cwd(), 'src/theme/themes.ts'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--write' || arg === '-w') {
      result.write = true;
      continue;
    }
    if (arg === '--file' || arg === '-f') {
      const next = argv[i + 1];
      if (next) {
        result.file = path.resolve(process.cwd(), next);
        i += 1;
      }
      continue;
    }
    if (!arg.startsWith('-')) {
      // Positional file arg
      result.file = path.resolve(process.cwd(), arg);
    }
  }
  return result;
}

function main() {
  const { write, file } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const original = fs.readFileSync(file, 'utf8');
  const { converted, replacements } = convertHexColorsToHsl(original);

  if (write) {
    fs.writeFileSync(file, converted, 'utf8');
    console.log(`Converted ${replacements} hex color${replacements === 1 ? '' : 's'} to HSL in ${file}`);
  } else {
    process.stdout.write(converted);
    console.error(`(dry-run) Would convert ${replacements} hex color${replacements === 1 ? '' : 's'} to HSL in ${file}`);
  }
}

main();
