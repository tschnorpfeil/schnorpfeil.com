import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.join(__dirname, 'src', 'template.html');
const localesPath = path.join(__dirname, 'src', 'locales');
const outputDir = __dirname;

// Base path for deployment (e.g., '/schnorpfeil.com/' for GitHub Pages)
const basePath = process.env.BASE_PATH || '/';

const templateDir = path.dirname(templatePath);

// Ensure template exists
if (!fs.existsSync(templatePath)) {
    console.error('Error: src/template.html not found.');
    process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf-8');

const locales = ['de', 'en', 'pl', 'ru'];

locales.forEach(lang => {
    const localeFile = path.join(localesPath, `${lang}.json`);
    if (!fs.existsSync(localeFile)) {
        console.warn(`Warning: Missing locale file for ${lang}`);
        return;
    }

    let rendered = template;
    const translations = JSON.parse(fs.readFileSync(localeFile, 'utf-8'));

    // Inject Language Code for HTML lang attribute
    rendered = rendered.replace(/{{ lang }}/g, lang);

    // Setup Navigation active states and URL prefixes
    const isDe = lang === 'de';
    const baseUrl = isDe ? basePath : `${basePath}${lang}/`;

    // Inject baseUrl for logo link, canonical, etc.
    rendered = rendered.replace(/{{ baseUrl }}/g, baseUrl);

    // Render translation keys
    for (const [key, value] of Object.entries(translations)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gs');
        rendered = rendered.replace(regex, value);
    }

    // Create Output Directory if necessary
    const outPath = isDe ? path.join(outputDir, 'index.html') : path.join(outputDir, lang, 'index.html');
    const outDir = path.dirname(outPath);

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    // Inject proper active localized styles on switcher
    const switcherRegex = new RegExp(`<!-- SW_${lang.toUpperCase()} -->.*?<!-- END_SW_${lang.toUpperCase()} -->`, 'sg');
    rendered = rendered.replace(switcherRegex, `<span class="nav-link active mx-1.5 font-bold text-xs border-b-2 border-primary pb-[1px] transition-colors duration-300">${lang.toUpperCase()}</span>`);

    // Clean up remaining switcher tags for unselected languages to standard links
    const cleanupRegexes = [
        { code: 'de', url: basePath },
        { code: 'en', url: `${basePath}en/` },
        { code: 'pl', url: `${basePath}pl/` },
        { code: 'ru', url: `${basePath}ru/` }
    ];

    cleanupRegexes.forEach(c => {
        if (c.code !== lang) {
            const cleanRe = new RegExp(`<!-- SW_${c.code.toUpperCase()} -->.*?<!-- END_SW_${c.code.toUpperCase()} -->`, 'sg');
            rendered = rendered.replace(cleanRe, `<a href="${c.url}" class="nav-link mx-1.5 transition-colors duration-300 text-xs font-semibold uppercase cursor-pointer">${c.code.toUpperCase()}</a>`);
        }
    });

    fs.writeFileSync(outPath, rendered, 'utf-8');
});

console.log('✅ SSG Build Complete: Localized MPAs generated.');
