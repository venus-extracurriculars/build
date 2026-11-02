// Run after npm run build. Uses a local HTTP stub and synthetic data only.
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert/strict');
const repo = path.resolve(__dirname, '../..'), { _electron } = require(path.join(repo, 'node_modules/playwright'));
const data = fs.mkdtempSync(path.join(require('os').tmpdir(), 've-prompt-hooks-')), id = 'review-prompt-hook', folder = path.join(data, 'mods', id, '1.0.0');
fs.mkdirSync(folder, { recursive: true });
const requests = [];
const server = http.createServer((req, res) => { let s = ''; req.on('data', c => s += c); req.on('end', () => { if (!s) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ id: 'synthetic' }] }));
    return;
} const b = JSON.parse(s); requests.push(b); const text = JSON.stringify({ lines: [], summary: 'Synthetic test', vars: [{ name: 'trust', op: 'add', value: '2' }] }); if (b.stream) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
}
else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: text }, finish_reason: 'stop' }] }));
} }); });
(async () => {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    fs.writeFileSync(path.join(folder, 'vxmod.json'), JSON.stringify({ manifest: 1, id, name: 'Review prompt hook', author: 'Review fixture', version: '1.0.0', blurb: 'Local synthetic test', source: 'https://github.com/venus-extracurriculars/build', kit: '0.7.0', hooks: ['advancedSettingsEntry', 'renderer:registerHooks', 'main:registerFinalRequest'], main: true, scope: 'anytime', defaultOn: true }));
    fs.writeFileSync(path.join(folder, 'renderer.js'), `import {jsx} from 'react/jsx-runtime';import {registerHooks} from '@vx/modkit/renderer';registerHooks('${id}',{advancedSettingsEntry:({busy})=>jsx('div',{id:'review-advanced-slot',children:busy?'busy':'Review hook ready'})});`);
    fs.writeFileSync(path.join(folder, 'main.js'), `const {registerFinalRequest}=require('@vx/modkit/main');registerFinalRequest('${id}',(r,{tag})=>({request:{...r,user:r.user+' VERIFIED'},sampling:{temperature:0.3},finish:()=>({tag,processed:true})}));module.exports={};`);
    fs.writeFileSync(path.join(data, 'mods', 'installed.json'), JSON.stringify({ schemaVersion: 1, mods: { [id]: { '1.0.0': { source: 'https://github.com/venus-extracurriculars/build', sha256: '', approved: true, installedAt: '2026-11-01T00:00:00Z' } } } }));
    fs.writeFileSync(path.join(data, 'mods.json'), JSON.stringify({ schemaVersion: 1, on: { [id]: true, 'prompt-studio': true, 'story-memory': true }, options: {} }));
    fs.writeFileSync(path.join(data, 'settings.json'), JSON.stringify({ schemaVersion: 1, apiProvider: 'openai', apiModel: 'gemini-3.8-flash', thinkingLevel: 'minimal', removedDefaults: [], apiKey: 'e2e-not-a-key', endpointUrl: 'http://127.0.0.1:' + port + '/v1', endpointModel: 'synthetic', comfyDeferred: true, noNsfwImages: false, lessNsfwText: false, sfwAsked: true, checkUpdates: false, fullscreen: false }));
    let app;
    try {
        const env = { ...process.env, VU_DATA_PATH: data };
        delete env.ELECTRON_RUN_AS_NODE;
        app = await _electron.launch({ args: [repo], env });
        const page = await app.firstWindow();
        page.on('pageerror', error => console.error('Renderer error:', error.message));
        await page.waitForSelector('#menu-settings, #app-error', { timeout: 60000 });
        for (let n = 0; n < 3 && await page.locator('#app-error').count(); n++) {
            await page.click('#app-error-dismiss');
            await page.waitForTimeout(200);
        }
        await page.click('#menu-settings');
        await page.click('#settings-tab-advanced');
        await page.waitForSelector('#review-advanced-slot');
        await page.click('#advanced-prompt-studio');
        await page.waitForSelector('#prompt-studio-modal');
        // Target the tab directly while Motion and Electron's page zoom settle.
        await page.locator('#studio-tab-scene').dispatchEvent('click');
        try {
            await page.waitForSelector('#studio-page-scene', { timeout: 5000 });
        } catch (error) {
            console.error(await page.locator('#prompt-studio-modal').innerText());
            throw error;
        }
        assert.equal(await page.locator('#studio-page-scene .vu-studio-row').count(), 8);
        const reply = await page.evaluate(async (id) => window.api.llm.completeScene({ system: 'System', user: 'User', schema: { name: 'scene', schema: { type: 'object', properties: { lines: { type: 'array', items: { type: 'object' } } }, required: ['lines'] } }, parts: [{ id: 'reader', role: 'user', text: 'User' }], sceneSpot: { spot: 'opening', cast: [] }, modTags: { [id]: { proof: 7 } } }, 'review-hook', 'review-stream'), id);
        assert.equal(reply.ok, true, JSON.stringify(reply));
        assert.deepEqual(reply.data.modReply, { [id]: { tag: { proof: 7 }, processed: true } });
        assert.equal(requests.length, 1);
        assert.ok(JSON.stringify(requests[0]).includes('User VERIFIED'));
        assert.equal(requests[0].temperature, 0.3);
        for (const key of ['modTags', 'parts', 'sceneSpot'])
            assert.ok(!JSON.stringify(requests[0]).includes('"' + key + '"'), key);
        const presetReply = await page.evaluate(async () => {
            const listed = await window.api.presets.list();
            if (!listed.ok)
                throw Error('list failed');
            const read = await window.api.presets.get(listed.data.active);
            if (!read.ok)
                throw Error('get failed');
            const p = read.data;
            p.sampling = { temperature: 0.6 };
            p.blocks.push({ id: 'proof-block', name: 'Integration proof', role: 'user', enabled: true, position: 'ordered', depth: 0, content: 'SINGLE_PRESET_MARKER' });
            const saved = await window.api.presets.save(p);
            if (!saved.ok)
                throw Error('save failed');
            return window.api.llm.completeScene({ system: 'PERSONA\n\nRULES', user: 'NOW\n\nYOUR TURN',
                schema: { name: 'scene', schema: { type: 'object', properties: { lines: { type: 'array', items: { type: 'object' } } }, required: ['lines'] } },
                parts: [{ id: 'persona', role: 'system', text: 'PERSONA' }, { id: 'jsonRules', role: 'system', text: 'RULES' }, { id: 'now', role: 'user', text: 'NOW' }, { id: 'yourTurn', role: 'user', text: 'YOUR TURN' }],
                preset: { spot: 'opening', playthroughId: '123', vars: { trust: '1' }, names: { user: 'Sam', char: 'Sarah', group: 'Sarah' } },
                storyMemory: { playthroughId: '123', date: 3, time: 0, cast: ['a'], query: 'atlas', names: { reader: 'Sam', a: 'Sarah' }, records: [{ id: 'encounter:1:0', kind: 'encounter', subject: 'reader', subjects: ['a'], text: 'Sarah borrowed an atlas.', date: 1, time: 0, knownBy: [], public: false, timeline: 'unspecified', certainty: 'event', claimant: null, evidence: '', source: 'Saved summary', supersedes: [] }] }
            }, 'preset-proof', 'preset-proof-stream');
        });
        assert.equal(presetReply.ok, true, JSON.stringify(presetReply));
        assert.deepEqual(presetReply.data.presetVars, { trust: '3' });
        const wire = JSON.stringify(requests[1]);
        assert.ok(wire.includes('Sarah borrowed an atlas.'), 'Story Memory survives preset assembly');
        assert.equal(wire.split('SINGLE_PRESET_MARKER').length - 1, 1, 'Preset is applied once');
        assert.equal(requests[1].temperature, 0.6);
        for (const key of ['modTags', 'parts', 'sceneSpot', 'storyMemory', 'preset'])
            assert.ok(!wire.includes('"' + key + '"'), key);
        await page.evaluate(async () => { const m = await window.api.mods.get(); if (!m.ok)
            throw Error('mods'); m.data.on['prompt-studio'] = false; await window.api.mods.set(m.data); });
        const off = await page.evaluate(() => window.api.llm.completeScene({ system: 'Plain', user: 'Unchanged', schema: { name: 'scene', schema: { type: 'object', properties: { lines: { type: 'array', items: { type: 'object' } } }, required: ['lines'] } }, preset: { spot: 'opening', playthroughId: '123', vars: { trust: '1' }, names: { user: 'Sam', char: 'Sarah', group: 'Sarah' } } }, 'off-proof', 'off-stream'));
        assert.equal(off.ok, true, JSON.stringify(off));
        assert.equal(off.data.presetVars, undefined);
        assert.ok(!JSON.stringify(requests[2]).includes('SINGLE_PRESET_MARKER'));
        const report = { passed: true, checks: ['Installed mod renders the new Advanced tab slot', 'Actual preload/IPC/main hook rewrites a scene request', 'Per-call sampling reaches the local endpoint', 'App-only metadata is absent from the provider body', 'Main finish output returns through modReply', 'Story Memory precedes preset assembly and survives it', 'Bundled preset applies once with saved variables and sampling', 'Turning Prompt Studio off removes its request effects'], provider: 'Loopback synthetic HTTP server; no external model calls' };
        console.log(JSON.stringify(report));
    }
    finally {
        await app?.close();
        server.close();
        assert.equal(path.dirname(data), require('os').tmpdir());
        fs.rmSync(data, { recursive: true, force: true });
    }
})().catch(e => { server.close(); console.error(e.stack); process.exitCode = 1; });
