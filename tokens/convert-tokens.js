const fs = require('fs');
const path = require('path');

// Helper to convert camelCase to kebab-case
function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Helper to convert spaces to hyphens and lowercase
function formatKeyName(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

// Parse HSL color string e.g., "hsl(222, 37%, 12%)" or "hsl(0, 0%, 0%)"
function parseHSL(hslStr) {
  if (typeof hslStr !== 'string') return null;
  const match = hslStr.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  if (!match) return null;
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3])
  };
}

// Interpolate between two HSL colors
function interpolateHSL(colorA, valA, colorB, valB, targetVal) {
  const t = (targetVal - valA) / (valB - valA);
  
  // If one of the endpoints is black/white (S=0 or L=0 or L=100),
  // we shouldn't interpolate Hue and Saturation from it, as it will distort the color.
  // We use the other endpoint's Hue and Saturation instead.
  let h, s;
  if (colorA.s === 0 || colorA.l === 0 || colorA.l === 100) {
    h = colorB.h;
    s = colorB.s;
  } else if (colorB.s === 0 || colorB.l === 0 || colorB.l === 100) {
    h = colorA.h;
    s = colorA.s;
  } else {
    h = colorA.h + t * (colorB.h - colorA.h);
    s = colorA.s + t * (colorB.s - colorA.s);
  }
  
  const l = colorA.l + t * (colorB.l - colorA.l);
  
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l * 10) / 10}%)`;
}

// Recursive helper to resolve token references like "{color.palette.primary.100}"
// Supports interpolation for numeric palette values that aren't explicitly defined.
function resolveTokenValue(val, colorData) {
  if (typeof val !== 'string') return val;
  const match = val.match(/^\{([^}]+)\}$/);
  if (!match) return val;
  
  const parts = match[1].split('.');
  let current = colorData;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (current && current[part] !== undefined) {
      current = current[part];
    } else if (current && typeof current === 'object') {
      // Check if this is a numeric palette where we can interpolate the missing stop
      const keys = Object.keys(current).map(Number).filter(n => !isNaN(n));
      const targetVal = Number(part);
      
      if (keys.length > 0 && !isNaN(targetVal)) {
        keys.sort((a, b) => a - b);
        
        let valA = null;
        let valB = null;
        
        for (let j = 0; j < keys.length; j++) {
          if (keys[j] <= targetVal) {
            valA = keys[j];
          }
          if (keys[j] >= targetVal && valB === null) {
            valB = keys[j];
          }
        }
        
        if (valA !== null && valB !== null) {
          if (valA === valB) {
            current = current[valA];
          } else {
            const hslA = parseHSL(resolveTokenValue(current[valA], colorData));
            const hslB = parseHSL(resolveTokenValue(current[valB], colorData));
            if (hslA && hslB) {
              current = interpolateHSL(hslA, valA, hslB, valB, targetVal);
            } else {
              throw new Error(`Failed to interpolate HSL colors for path "${match[1]}"`);
            }
          }
        } else {
          throw new Error(`Failed to resolve token reference: "${val}" at segment "${part}" (no surrounding keys)`);
        }
      } else {
        throw new Error(`Failed to resolve token reference: "${val}" at segment "${part}"`);
      }
    } else {
      throw new Error(`Failed to resolve token reference: "${val}" at segment "${part}"`);
    }
  }
  
  return resolveTokenValue(current, colorData);
}

function generateCSS() {
  const colourTokensPath = path.join(__dirname, 'colour-tokens.json');
  const designTokensPath = path.join(__dirname, 'design-tokens.tokens.json');
  const outputPath = path.join(__dirname, 'design-tokens.css');
  
  if (!fs.existsSync(colourTokensPath)) {
    console.error(`Error: colour-tokens.json not found at ${colourTokensPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(designTokensPath)) {
    console.error(`Error: design-tokens.tokens.json not found at ${designTokensPath}`);
    process.exit(1);
  }
  
  const colourTokens = JSON.parse(fs.readFileSync(colourTokensPath, 'utf8'));
  const designTokens = JSON.parse(fs.readFileSync(designTokensPath, 'utf8'));
  
  let cssContent = `/* ====================================================
 * DESIGN TOKENS (AUTOMATICALLY GENERATED)
 * ====================================================
 * Note: Only semantic color roles are exposed below.
 * Primitive/palette colors are resolved and not exposed
 * directly to the UI, as per system design guidelines.
 * ==================================================== */

:root {
  /* ==================================================
   * TYPOGRAPHY TOKENS
   * ================================================== */
`;
  
  // Parse typography tokens
  const typography = designTokens.typography;
  if (typography) {
    for (const [styleName, properties] of Object.entries(typography)) {
      const kebabStyleName = formatKeyName(styleName);
      cssContent += `  /* ${styleName} */\n`;
      for (const [propName, propObj] of Object.entries(properties)) {
        const value = propObj.value;
        const type = propObj.type;
        
        let kebabPropName = camelToKebab(propName);
        if (kebabPropName === 'text-case') {
          kebabPropName = 'text-transform';
        }
        
        let cssValue = value;
        if (type === 'dimension' && typeof value === 'number') {
          cssValue = `${value}px`;
        } else if (propName === 'fontFamily') {
          cssValue = `'${value}', sans-serif`;
        }
        
        cssContent += `  --typography-${kebabStyleName}-${kebabPropName}: ${cssValue};\n`;
      }
      cssContent += `\n`;
    }
  }
  
  cssContent += `  /* ==================================================
   * COLOR ROLES - LIGHT THEME (DEFAULT)
   * ================================================== */
`;
  
  const colorData = colourTokens.color;
  if (!colorData || !colorData.role) {
    console.error('Error: Invalid color tokens format. Expected "color.role" structure.');
    process.exit(1);
  }
  
  const lightRoles = colorData.role.light;
  const darkRoles = colorData.role.dark;
  
  // Helper to generate CSS variables list for a theme role map
  function generateRoleVariables(roleMap, indent = '  ') {
    let output = '';
    for (const [roleName, unresolvedValue] of Object.entries(roleMap)) {
      const kebabRoleName = camelToKebab(roleName);
      const resolvedValue = resolveTokenValue(unresolvedValue, colourTokens);
      output += `${indent}--color-${kebabRoleName}: ${resolvedValue};\n`;
    }
    return output;
  }
  
  cssContent += generateRoleVariables(lightRoles, '  ');
  cssContent += `}\n\n`;
  
  // Explicit Light Theme
  cssContent += `/* ==================================================
 * COLOR ROLES - EXPLICIT LIGHT THEME SELECTOR
 * ================================================== */
[data-theme="light"] {\n`;
  cssContent += generateRoleVariables(lightRoles, '  ');
  cssContent += `}\n\n`;
  
  // Explicit Dark Theme
  cssContent += `/* ==================================================
 * COLOR ROLES - EXPLICIT DARK THEME SELECTOR
 * ================================================== */
[data-theme="dark"] {\n`;
  cssContent += generateRoleVariables(darkRoles, '  ');
  cssContent += `}\n\n`;
  
  // Media Query dark mode
  cssContent += `/* ==================================================
 * COLOR ROLES - AUTOMATIC SYSTEM DARK MODE SUPPORT
 * ================================================== */
@media (prefers-color-scheme: dark) {\n`;
  cssContent += `  :root {\n`;
  cssContent += generateRoleVariables(darkRoles, '    ');
  cssContent += `  }\n`;
  cssContent += `}\n`;
  
  fs.writeFileSync(outputPath, cssContent, 'utf8');
  console.log(`Success: Generated single CSS tokens file at ${outputPath}`);
}

generateCSS();
