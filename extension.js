const Clutter = imports.gi.Clutter;
const St = imports.gi.St;

const Meta = imports.gi.Meta;
const Settings = imports.ui.settings;

let focusSignalId = null;
let windowSignals = [];
let borderActor = null;
let settings = null;

let config = {
    borderWidth: 2,
    borderColor: 'rgba(53, 132, 228, 1.0)'
};

function init(metadata) {
    settings = new Settings.ExtensionSettings(config, 'mint-focus', metadata.uuid);
    settings.bind('border-width', 'borderWidth', onSettingsChanged);
    settings.bind('border-color', 'borderColor', onSettingsChanged);
}

function onSettingsChanged() {
    if (borderActor) {
        borderActor.set_style(`border: ${config.borderWidth}px solid ${config.borderColor}; background-color: transparent; pointer-events: none;`);
    }
}

function getActiveWindow() {
    return global.display.focus_window || null;
}

function updateBorder() {
    let win = getActiveWindow();
    
    if (!win || win.window_type === Meta.WindowType.DESKTOP || win.is_override_redirect()) {
        if (borderActor) borderActor.hide();
        return;
    }

    let rect = win.get_frame_rect();
    
    if (!borderActor) {
        borderActor = new St.Bin({
            name: 'cinnamon-focus-border',
            reactive: false
        });
        onSettingsChanged(); 
        global.window_group.add_actor(borderActor);
    }

    borderActor.set_position(rect.x, rect.y);
    borderActor.set_size(rect.width, rect.height);
    borderActor.show();
    borderActor.raise_top();
}

function onFocusChanged() {
    windowSignals.forEach(item => {
        try { item.obj.disconnect(item.id); } catch(e) {}
    });
    windowSignals = [];

    let win = getActiveWindow();
    if (win) {
        let pId = win.connect('position-changed', updateBorder);
        let sId = win.connect('size-changed', updateBorder);
        windowSignals.push({ obj: win, id: pId });
        windowSignals.push({ obj: win, id: sId });
    }
    updateBorder();
}

function enable() {
    if (global.display) {
        focusSignalId = global.display.connect('notify::focus-window', onFocusChanged);
        onFocusChanged();
    }
}

function disable() {
    if (focusSignalId && global.display) {
        global.display.disconnect(focusSignalId);
        focusSignalId = null;
    }
    windowSignals.forEach(item => {
        try { item.obj.disconnect(item.id); } catch(e) {}
    });
    windowSignals = [];
    
    if (borderActor) {
        borderActor.destroy();
        borderActor = null;
    }
}
