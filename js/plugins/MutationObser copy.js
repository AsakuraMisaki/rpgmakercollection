SceneManager.isGameActive = function () {
    return true;
};

let PIXI_Container_update = PIXI.Container.prototype.update;
PIXI.Container.prototype.update = function () {
    if (PIXI_Container_update) {
        PIXI_Container_update.call(this, ...arguments);
    }
    this.children.forEach((c) => {
        if (c.ell) {
            c.x = c.ell.offsetLeft || 0;
            c.y = c.ell.offsetTop || 0;
            c.width = c.ell.offsetWidth || 0;
            c.height = c.ell.offsetHeight || 0;
        }
    })
}

var TempUIinfo = {};
TempUIinfo.itemList = [
    { des: 'aabb', url: './img/system/Window.png', url1: './img/system/Window.png' },
    { des: 'aabb1', url: './img/system/IconSet.png', url1: './img/system/Window.png' },
    { des: 'aabb2', url: './img/system/IconSet.png', url1: './img/system/Window.png' }
]
let childrenHandle = function (c, data) {
    let _source = c.getAttribute(':source');
    let encode = /\[|\]/i.test(_source);
    let source = _source.replace(/\[|\]/g, '');
    let value = (encode ? data[source] : _source);
    let newUI;
    if (/sprite/i.test(c.tagName)) {
        newUI = new PIXI.Sprite();
        let img = new Image();
        img.src = value;
        newUI.texture = PIXI.Texture.from(img);
    }
    else if (/text/i.test(c.tagName)) {
        newUI = new PIXI.Text();
        newUI.text = value;
    }
    else if (/icon/i.test(c.tagName)) {
        newUI = new PIXI.Sprite();
        let img = new Image();
        img.src = value;
        newUI.texture = PIXI.Texture.from(img);
    }
    else if (/graphics/i.test(c.tagName)) {
        newUI = new PIXI.Graphics();
    }
    else {
        newUI = new PIXI.Container();
    }
    let ell = document.createElement(c.tagName);
    for (let i = 0; i < c.attributes.length; i++) {
        let attr = c.attributes[i];
        ell.setAttribute(attr.name, attr.value);
    }
    newUI.ell = ell;
    let children = Array.prototype.slice.call(c.children);
    children.forEach((c1, i) => {
        let ui = childrenHandle(c1, data);
        if (ui) {
            newUI.addChild(ui);
            newUI.ell.appendChild(ui.ell);
        }
    })
    return newUI;
}
let Handle = function (source, template) {
    let newList = new PIXI.Container();
    let ell = document.createElement(template.tagName);
    for (let i = 0; i < template.attributes.length; i++) {
        let attr = template.attributes[i];
        ell.setAttribute(attr.name, attr.value);
    }
    newList.ell = ell;
    source = source || TempUIinfo.itemList || [];
    let child = template.children[0];
    source.forEach((data, i) => {
        let ui = childrenHandle(child, data);
        if (ui) {
            newList.addChild(ui);
            newList.ell.appendChild(ui.ell);
        }
    })
    
    return newList;
}

const fs = require('fs');


let globalWatchWaiting = {};
let globalWatching = {};
let readUIfile = function(err, data, path){
    if (err || !data) {
        console.error('读取文件出错:', err);
        return;
    }
    
    let parser = new DOMParser();
    let xml = parser.parseFromString(data, "text/html");
    console.log(xml);
    let uis = Handle(undefined, xml.body.children[0].children[0]);
    
    if(uis){
        let pre = globalWatching[path];
        if(pre){
            if(pre.parent){
                pre.parent.removeChild(pre);
                if(pre.ell && pre.ell.parentElement){
                    pre.ell.parentElement.removeChild(pre.ell);
                }
            }
            pre = null;
        }
        globalWatching[path] = uis;
        SceneManager._scene.addChild(uis);
        document.body.appendChild(uis.ell);
    }
    return uis;
}
let spliceResReload = function (path, type, cb) {
    let xml = new XMLHttpRequest();
    xml.open("GET", path);
    xml.overrideMimeType(type || 'text/html');
    xml.send();
    xml.addEventListener('load', () => {
        cb ? cb(xml.response) : null;
    })
}
// 监听文件或目录的变化
fs.watch('./obs/ui.html', (eventType, filename) => {
    if(globalWatchWaiting['./obs/ui.html']) return;
    if (eventType === 'change') {
        globalWatchWaiting['./obs/ui.html'] = true;
        spliceResReload('./obs/ui.html', 'text/html', (data)=>{
            readUIfile(0, data, './obs/ui.html');
        })
        // let data = fs.readFileSync('./obs/ui.html', 'utf8');
        // readUIfile(0, data, './obs/ui.html');
    }
        
    let id = setTimeout(() => {
        clearTimeout(id);
        globalWatchWaiting['./obs/ui.html'] = false;
    }, 1000)
});
