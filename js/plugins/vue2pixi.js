(function (global, factory) {
    if(!global) return;
    let common = (typeof exports === 'object' && typeof module !== 'undefined'); // CommonJS
    common ? factory(exports) : factory( global.Vue2Pixi = { } ); //Universal
})(window || global || self || globalThis, function (exports) {
    
    const _version = `0.1`;
    const FS = (typeof require != 'undefined' ? require('fs') : null);


    let loader = function () { this.initialize(...arguments) };
    loader.prototype.initialize = function(path, type, options = { }){
        this.path = path;
        this.type = type;
        Object.assign(this, options);
    }
    loader.prototype.load = function(){
        let clo = (resolve, reject)=>{
            let xml = new XMLHttpRequest();
            xml.open('GET', path);
            xml.overrideMimeType(this.type || 'text/html');
            xml.send();
            xml.addEventListener('error', ()=>{
                reject(xml);
            })
            xml.addEventListener('load', ()=>{
                resolve(xml.response);
            })
        }
        return new Promise(clo);
    }

    let splicer = function () { this.initialize(...arguments) };
    splicer.prototype.initialize = function(vue, options = { }){
        this.vue = vue;
        Object.assign(this, options);
    }
    splicer.prototype.splice = function(){

    }

    let biter = function () { this.initialize(...arguments) };
    biter.prototype.initialize = function(vue, options = { }){
        this.vue = vue;
        Object.assign(this, options);
    }
    biter.prototype.bite = function(){

    }   

    let watcher = function () { this.initialize(...arguments) };
    watcher.prototype.initialize = function(path, options = { }){
        this.path = path;
        Object.assign(this, options);
    }
    watcher.prototype.watch = function(){
        if(!FS){
            console.warn(`watch ${this.path} failed with the 'require' module missing`);
            return;
        }
        let clo = (resolve, reject)=>{
            let cb = (eventType, filename)=>{
                if(this.wait) return;
                if (eventType === 'change') {
                    let loader = new loader(this.path, this.mime || 'text/html');
                    loader.load().then((data)=>{
                        resolve(data);
                    })
                    this.wait = 1000;
                    let id = setTimeout(() => {
                        clearTimeout(id);
                        this.wait = null;
                    }, this.wait);
                }    
            }
            this.watching = FS.watch(this.path, this.encoding || 'utf-8', cb);
        }
        let promise = new Promise(clo);
        return promise;
    }
    watcher.prototype.close = function(){
        if(!this.watching) return;
        this.watching.close();
    }

    let common = { };
    common.makeInstanceByCompleteName = function(){
        let _class = this.getClassByCompleteName(name);
        if(!_class) return;
        let args = Array.from(arguments);
        args.splice(0, 1);
        return new _class(...args);
    }
    common.getClassByCompleteName = function(name){
        let _class = new Function(`
            if(typeof(${name}) == 'undefined') return;
            return ${name}`
        )();
        if(!_class) return;
        return _class;
    }

    

    let pixier = function () { this.initialize(...arguments) };
    pixier.prototype.initialize = function(vue, options){
        this.vue = vue;
        Object.assign(this, options);
    }
    pixier.prototype.build = function(template){
        let clo = (resolve, rejects)=>{
            let ui = this.handle(template);
            resolve(ui);
        }
        return new Promise(clo);
    }
    pixier.prototype.createVueApp = function(element){
        let app = Vue.createApp({}).mount(element);
        return app;
    }
    pixier.prototype.handle = function(element){
        let type = element.tagName.split(/:/i)[0];
        let newEl = document.createElement(element.tagName);
        element.attributes.forEach((attr)=>{
            newEl.setAttribute(attr.name, attr.value);
        })
        let handler = this[`handle${type}`];
        let ui;
        if(handler){
            ui = handler(element);
        }
        else{
            console.warn(`invalid handler`, element);
            return;
        }
        ui ? ui.html = newEl : 0;
        let children = Array.prototype.slice.call(template.children);
        children.forEach((c)=>{
            let sub = this.handle(c);
            if(ui && sub){
                ui.html.appendChild(sub.html);
                ui.addChild(sub);
            }
        })
    }
    pixier.prototype.handleSprite = function(element){
        let value = element.getAttribute(':source');
        let newUI = new PIXI.Sprite();
        let img = new Image();
        img.src = value;
        newUI.texture = PIXI.Texture.from(img);
        return newUI;
    }   
    pixier.prototype.handleText = function(element){
        let value = element.getAttribute(':source');
        let newUI = new PIXI.Sprite();
        let img = new Image();
        img.src = value;
        newUI.texture = PIXI.Texture.from(img);
        return newUI;
    }
    pixier.prototype.handleIcon = function(element){
        let value = element.getAttribute(':source');
        let newUI = new PIXI.Sprite();
        let img = new Image();
        img.src = value;
        newUI.texture = PIXI.Texture.from(img);
        return newUI;
    }
    pixier.prototype.handleGraphics = function(element){
        let value = element.getAttribute(':source');
        let newUI = new PIXI.Sprite();
        let img = new Image();
        img.src = value;
        newUI.texture = PIXI.Texture.from(img);
        return newUI;
    }
    

    // pixi compate
    let PIXI_Container_update = PIXI.Container.prototype.update;
    PIXI.Container.prototype.update = function(){
        PIXI_Container_update ? PIXI_Container_update.call(this, ...arguments) : 0;
        this.syncHtml();
    }
    PIXI.Container.prototype.syncHtml = function(){
        let sync = (el)=>{
            if(!el.html) return;
            el._syncHtml();
        }
        this.children.forEach(sync);
    }
    PIXI.Container.prototype._syncHtml = function(){
        // base compate
        this.x = this.html.offsetLeft;
        this.y = this.html.offsetTop;
        this.width = this.html.offsetWidth;
        this.hegiht = this.html.offsetHeight;
        // 
    }


    // .common utils
    exports.common = common;
    // .vue decode
    exports.loader = loader;
    exports.splicer = splicer;
    exports._version = _version;
    exports.biter = biter;
    exports.watcher = watcher;
    // .vue 2 pixi
    exports.pixier = pixier;
});