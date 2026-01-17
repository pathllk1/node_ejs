#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const parseArgs = (argv) => {
    const out = {};
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
            out[key] = val;
        }
    }
    return out;
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const main = () => {
    const args = parseArgs(process.argv);

    const src = args.src;
    const dst = args.dst;
    const prefix = args.prefix;

    if (!src || !dst || !prefix) {
        process.stderr.write(
            'Usage: node scripts/clone-inventory-script.js --src <source.js> --dst <output.js> --prefix <prefix> [--container <domId>] [--apiBase <basePath>]\n'
        );
        process.exit(1);
    }

    const containerId = args.container || null;
    const apiBase = args.apiBase || null;

    const absSrc = path.resolve(process.cwd(), src);
    const absDst = path.resolve(process.cwd(), dst);

    let code = fs.readFileSync(absSrc, 'utf8');

    // 1) Container swap (e.g., 'sales' => 'debit-note')
    if (containerId) {
        code = code.replace(
            /document\.getElementById\((['"])sales\1\)/g,
            `document.getElementById('${containerId}')`
        );
        code = code.replace(
            /document\.getElementById\((['"])purchase\1\)/g,
            `document.getElementById('${containerId}')`
        );
    }

    // 2) API base swap (e.g., '/inventory/api/...' => '/inventory/dnt/api/...')
    if (apiBase) {
        code = code.replace(/(['"])\/inventory\/api\//g, `$1${apiBase.replace(/\/$/, '')}/api/`);
    }

    // 3) Prefix DOM ids used in rendered HTML + selectors
    const idRegex = /id=\"([^\"]+)\"/g;
    const idSet = new Set();
    let m;
    while ((m = idRegex.exec(code)) !== null) {
        idSet.add(m[1]);
    }

    const idMap = new Map();
    for (const id of idSet) {
        if (id.startsWith(prefix + '-')) continue;
        idMap.set(id, `${prefix}-${id}`);
    }

    for (const [oldId, newId] of idMap.entries()) {
        const oldEsc = escapeRegExp(oldId);
        const newEsc = newId;

        // id="..."
        code = code.replace(new RegExp(`id=\\\"${oldEsc}\\\"`, 'g'), `id=\"${newEsc}\"`);

        // querySelector('#id') / querySelectorAll('#id')
        code = code.replace(new RegExp(`(['"])#${oldEsc}\\1`, 'g'), `$1#${newEsc}$1`);

        // getElementById('id')
        code = code.replace(new RegExp(`getElementById\\((['"])${oldEsc}\\1\\)`, 'g'), `getElementById('${newEsc}')`);

        // setAttribute('id', 'id')
        code = code.replace(new RegExp(`(['"])id\\1\s*,\s*(['"])${oldEsc}\\2`, 'g'), `$1id$1, $2${newEsc}$2`);
    }

    // 4) Prefix declared function names (best-effort) and update references
    const reserved = new Set([
        'if', 'for', 'while', 'switch', 'catch', 'try', 'return', 'const', 'let', 'var',
        'function', 'async', 'await', 'new', 'class', 'delete', 'typeof', 'instanceof'
    ]);

    const declNames = new Set();

    // function foo(...) {}
    const funcDecl = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;
    while ((m = funcDecl.exec(code)) !== null) declNames.add(m[1]);

    // const foo = ( ... ) => OR const foo = async ( ... ) => OR const foo = function
    const varFuncDecl = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function\b)/g;
    while ((m = varFuncDecl.exec(code)) !== null) declNames.add(m[1]);

    const nameMap = new Map();
    for (const name of declNames) {
        if (reserved.has(name)) continue;
        if (name.startsWith(prefix)) continue;
        nameMap.set(name, `${prefix}${name[0].toUpperCase()}${name.slice(1)}`);
    }

    for (const [oldName, newName] of nameMap.entries()) {
        const oldEsc = escapeRegExp(oldName);
        code = code.replace(new RegExp(`\\b${oldEsc}\\b`, 'g'), newName);
    }

    fs.mkdirSync(path.dirname(absDst), { recursive: true });
    fs.writeFileSync(absDst, code, 'utf8');

    process.stdout.write(`Generated: ${dst}\n`);
};

main();
