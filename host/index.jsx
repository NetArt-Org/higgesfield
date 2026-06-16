/* index.jsx — ExtendScript host for Premiere Pro.
 * Each function takes a JSON string and returns a JSON string. The panel
 * (client/js/lib/cep.js) double-encodes the arg and JSON.parses the result.
 *
 * VERIFY-ON-DEVICE: a few calls are Premiere-version sensitive and are flagged:
 *   - hgExportFrame  (Sequence.exportFramePNG availability/signature)
 *   - hgApplyCuts    (QE DOM razor — qe is undocumented/unofficial)
 * The reliable primitives (import / place / append) use the documented DOM. */

#target premierepro

// ---- tiny JSON helpers (ExtendScript has no native JSON) ----
function _parse(s) { try { return eval('(' + s + ')'); } catch (e) { return {}; } }
function _str(v) {
    if (v === null || v === undefined) return 'null';
    var t = typeof v;
    if (t === 'number' || t === 'boolean') return String(v);
    if (t === 'string') {
        return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '') + '"';
    }
    var i, parts = [];
    if (v instanceof Array) {
        for (i = 0; i < v.length; i++) parts.push(_str(v[i]));
        return '[' + parts.join(',') + ']';
    }
    for (var k in v) { if (v.hasOwnProperty(k)) parts.push('"' + k + '":' + _str(v[k])); }
    return '{' + parts.join(',') + '}';
}
function _err(msg) { return _str({ __error: String(msg) }); }

var TICKS_PER_SECOND = 254016000000;

function _timeFromSeconds(sec) { var t = new Time(); t.seconds = sec; return t; }

function _fps(seq) {
    try { if (seq.timebase) return Math.round(TICKS_PER_SECOND / parseFloat(seq.timebase)); } catch (e) {}
    return 25;
}

function _pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }

function _timecode(sec, fps) {
    var totalFrames = Math.round(sec * fps);
    var f = totalFrames % fps;
    var totalSec = Math.floor(totalFrames / fps);
    var s = totalSec % 60, m = Math.floor(totalSec / 60) % 60, h = Math.floor(totalSec / 3600);
    return _pad(h, 2) + ':' + _pad(m, 2) + ':' + _pad(s, 2) + ':' + _pad(f, 2);
}

function _findItemByPath(root, p) {
    if (!root || !root.children) return null;
    for (var i = 0; i < root.children.numItems; i++) {
        var it = root.children[i];
        try {
            if (it.getMediaPath && it.getMediaPath() === p) return it;
        } catch (e) {}
        if (it.children && it.children.numItems) {
            var found = _findItemByPath(it, p);
            if (found) return found;
        }
    }
    return null;
}

function _importAndFind(p) {
    var proj = app.project;
    proj.importFiles([p], true, proj.rootItem, false);
    return _findItemByPath(proj.rootItem, p);
}

// ---- public host API ----

function hgSequenceInfo(argJson) {
    if (!app.project) return _err('No project open');
    var seq = app.project.activeSequence;
    if (!seq) return _err('No active sequence');
    var playhead = null;
    try { playhead = seq.getPlayerPosition().seconds; } catch (e) {}
    return _str({
        name: seq.name,
        fps: _fps(seq),
        width: seq.frameSizeHorizontal || null,
        height: seq.frameSizeVertical || null,
        videoTracks: seq.videoTracks ? seq.videoTracks.numTracks : null,
        audioTracks: seq.audioTracks ? seq.audioTracks.numTracks : null,
        playhead: playhead
    });
}

function hgExportFrame(argJson) {
    var a = _parse(argJson);
    var out = a.path;
    var seq = app.project && app.project.activeSequence;
    if (!seq) return _err('No active sequence');
    try {
        var t = (a.atSeconds != null) ? _timeFromSeconds(a.atSeconds) : seq.getPlayerPosition();
        if (seq.exportFramePNG) { seq.exportFramePNG(t.ticks, out); return _str({ path: out }); }
        return _err('exportFramePNG not available in this Premiere version — verify the frame-export API.');
    } catch (e) { return _err(e); }
}

function hgImportFile(argJson) {
    var a = _parse(argJson);
    if (!app.project) return _err('No project open');
    var item = _importAndFind(a.path);
    return _str({ imported: !!item, path: a.path });
}

function hgPlaceClip(argJson) {
    var a = _parse(argJson);
    var seq = app.project && app.project.activeSequence;
    if (!seq) return _err('No active sequence');
    var item = _importAndFind(a.path);
    if (!item) return _err('Imported item not found: ' + a.path);
    var track = a.audio ? seq.audioTracks[a.track || 0] : seq.videoTracks[a.track || 0];
    if (!track) return _err('Track not found');
    var at = (a.atSeconds != null) ? a.atSeconds : (function () { try { return seq.getPlayerPosition().seconds; } catch (e) { return 0; } })();
    var time = _timeFromSeconds(at);
    try {
        if (track.overwriteClip) track.overwriteClip(item, time);
        else if (track.insertClip) track.insertClip(item, time);
        else return _err('Track has no insert/overwrite method');
    } catch (e) { return _err(e); }
    return _str({ placed: true, atSeconds: at });
}

function hgAppendClip(argJson) {
    var a = _parse(argJson);
    var seq = app.project && app.project.activeSequence;
    if (!seq) return _err('No active sequence');
    var item = _importAndFind(a.path);
    if (!item) return _err('Imported item not found: ' + a.path);
    var track = a.audio ? seq.audioTracks[a.track || 0] : seq.videoTracks[a.track || 0];
    if (!track) return _err('Track not found');
    var end = 0;
    try { if (track.clips && track.clips.numItems > 0) end = track.clips[track.clips.numItems - 1].end.seconds; } catch (e) {}
    try { track.overwriteClip(item, _timeFromSeconds(end)); } catch (e) { return _err(e); }
    return _str({ appended: true, atSeconds: end });
}

function hgApplyCuts(argJson) {
    var a = _parse(argJson);
    var cuts = a.cuts || [];
    var seq = app.project && app.project.activeSequence;
    if (!seq) return _err('No active sequence');
    var fps = _fps(seq);
    if (app.enableQE) app.enableQE();
    var qeSeq = (typeof qe !== 'undefined' && qe.project) ? qe.project.getActiveSequence() : null;
    if (!qeSeq) return _str({ __error: 'QE DOM unavailable; razor not applied', requested: cuts.length });
    var applied = 0;
    for (var i = 0; i < cuts.length; i++) {
        try {
            var vt = qeSeq.getVideoTrackAt(a.track || 0);
            if (vt && vt.razor) { vt.razor(_timecode(cuts[i], fps)); applied++; }
        } catch (e) {}
    }
    return _str({ applied: applied, requested: cuts.length, note: 'Razor only; ripple-delete is a separate step.' });
}
