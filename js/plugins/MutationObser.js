/*:
@target MZ
@plugindesc h5桥接PIXI的文本驱动UI框架
@author 

@help 

240114
一种可行的交互判定拓展（或者说除了用h5原生实现交互外的另一种交互实现方式）
也就是用PIXI和RM相关API来实现滑过，点击，键盘等交互
这样的话就只由h5实现【相对坐标】带来的 列表，背包，导航栏等各种常见UI布局
这种好处是完全不用处理h5标签与PIXI对象间的边界对齐

目前使用的是 h5标签与PIXI对象间会边界对齐，以达到完全由h5处理布局，交互等UI功能，PIXI只负责渲染其他什么都不做

* @param DKTools.Localization:{}  
* @default false
* @desc DKTools对{}包裹内容的翻译兼容
* @type boolean

* @param SimpleWorkEditor
* @default false
* @desc 简易工作流
* @type boolean

*/

var MutationObser = {};
MutationObser.mzFlag = (PIXI.UniformGroup != undefined);
MutationObser.dom = new DOMParser();
MutationObser.params = PluginManager.parameters('MutationObser');
MutationObser.params.dk1 = (MutationObser.params['DKTools.Localization:{}'] == 'true');
MutationObser.params.SimpleWorkEditor = (MutationObser.params['SimpleWorkEditor'] == 'true');
MutationObser.globalRunningEvs = new PIXI.DisplayObject.EventEmitter();
// 加载处理
(() => {

    let spliceResReload = function (path, type, cb) {
        let xml = new XMLHttpRequest();
        xml.open("GET", path);
        xml.overrideMimeType(type || 'text/html');
        xml.send();
        xml.addEventListener('load', () => {
            cb ? cb(xml.response) : null;
        })
    }

    let drop = function (path) {
        let create = function (res) {
            let doc = MutationObser.dom.parseFromString(res, 'text/html');
            let styles = doc.head.getElementsByTagName('style');
            if(!styles.length){
                styles = doc.body.getElementsByTagName('style');
            }
            styles = Array.prototype.slice.call(styles);
            styles.forEach((s)=>{
                s.type = "text/css";
                document.head.appendChild(s);
            })
            let top = doc.getElementById('MutationObser');
            if (!top) return;
            for (let i = 0; i < top.children.length; i++) {
                MutationObser.global.append(top.children[i]);
                i--;
            }
        }
        spliceResReload(path, 'text/html', create);
    }

    document.addEventListener('dragover', function (event) {
        event.preventDefault();
    });

    document.addEventListener('drop', function (event) {
        event.preventDefault();
        for (let i = 0; i < event.dataTransfer.files.length; i++) {
            let file = event.dataTransfer.files[i];
            let path = './obs/' + file.name;
            drop(path);
        }
    });

    Object.assign(MutationObser, { spliceResReload, drop });
})();
// 内置预设
(() => {
    let css = `.ob-child{
            /* display: grid; */
            /* grid-template-columns: repeat(3, 1fr); */
            /* background-color: rgb(127, 226, 233); */
            position: absolute;
            --sx: 1;
            --sy: 1;
            --ax: 0;
            --ay: 0;
        }
        .pixi-center{
            --ax: 0.5;
            --ay: 0.5;
        }
        .pixi-centerX{
            --ax: 0.5;
        }
        .pixi-centerY{
            --ay: 0.5;
        }
        #MutationObser{
            position: absolute; 
            z-index: 99999;
            opacity: 1;
            display: block;
            transform-origin: 0 0;
        }`;
    let html = `<div id="---">
        <div id="MutationObser-gc" style="display: none;">
            <div class="ob-child">
                <div class="ob-child" type="text" text="abcdeftg"></div>
                <div class="ob-child" type="sprite" url="./img/system/IconSet.png" icon="1 32 32"></div>
                <div class="ob-child" type="sprite" url="./img/system/IconSet.png"></div>
            </div>
            <div class="ob-child"></div>
        </div>
        <div id="MutationObser"></div>
    </div>`;

    let loadPreset = function() {
        let doc = MutationObser.dom.parseFromString(html, 'text/html');
        let top = doc.getElementById('---');
        for (let i = 0; i < top.children.length; i++) {
            document.body.append(top.children[i]);
            i--;
        }
        let style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    loadPreset();
})();
// 核心 dom树观察-UI懒更新
(() => {

    MutationObser._observeEV_ = new CustomEvent('observe');
   

    let addStyle = function () {
        document.body.style.overflow = 'hidden';
        document.body.style.margin = document.body.style.padding = 0;
    }

    let Scene_Boot_create = Scene_Boot.prototype.create;
    Scene_Boot.prototype.create = function () {
        Scene_Boot_create.call(this, ...arguments);
        addStyle();
        topSetup();
    }

    let Scene_Base_create = Scene_Base.prototype.create;
    Scene_Base.prototype.create = function () {
        Scene_Base_create.call(this, ...arguments);
        if (MutationObser.global && MutationObser.global.style.width == '0px') {
            MutationObser.resize();
        }
    }

    let Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function () {
        Scene_Map_createDisplayObjects.call(this, ...arguments);
        if (MutationObser.global) {
            this.addChild(MutationObser.global.linkUImachine.ui);
        }
    }

    let topObser = function () {

        let attr = function (target, attr) {
            if (!target.linkUImachine) return;
            target.linkUImachine.propChange(attr);
        }

        let mutationsList = this.___tempMutationInfo.mutationsList;
        // 240111 对需要计算computedStyle的情况，用计时处理，避免dom侦听和逐帧的异步问题
        MutationObser.computedStyleRequired = 0;
        for (let mutation of mutationsList) {
            if (mutation.type == 'attributes') {
                attr(mutation.target, mutation.attributeName);
            }
            else if (mutation.type == 'childList') {
                let added = (mutation.addedNodes && mutation.addedNodes.length ? mutation.addedNodes : []);
                let removeed = (mutation.removedNodes && mutation.removedNodes.length ? mutation.removedNodes : []);
                added.forEach((el) => {
                    if (!el.linkUImachine) {
                        cycleCreateLinker(el);
                        return;
                    } 
                    el.linkUImachine.childListChange();
                })
                removeed.forEach((el) => {
                    if (!el.linkUImachine) return;
                    let ui = el.linkUImachine.ui;
                    ui.parent ? ui.parent.removeChild(ui) : 0;
                })
                // console.log('Add nodes:', mutation.addedNodes);
                // console.log('Removed nodes:', mutation.removedNodes);
            }
        }
    }
    let defaultStyleAbs = function(ui){
        let pixi = ``
        let base = `visibility: visible;
            left: 0px;
            top: 0px;
            color: rgb(255, 255, 255);  
            opacity: 1;
            margin: 0px;${pixi}`
        ;
        let text = `
            ${base}font-family: Arial;
            font-size: 16px;
            text-align: start;
            outline-color: rgb(0, 0, 0);
            outline-width: 0px;${pixi} 
        `;
        let sprite = `
            ${base}${pixi}
        `;
        if(ui instanceof PIXI.Text){
            return text;
        }
        else if(ui instanceof PIXI.Sprite){
            return sprite;
        }
        return base;
    };
    let cycleCreateLinker = function (node) {
        node.removeAttribute('id');
        // console.log(node);
        if (!node.linkUImachine) {
            let machine = new linkUImachine(node);
            machine.new();
            let attrs = Array.prototype.slice.call(node.attributes);
            if(!node.style.cssText.length){
                node.style.cssText = defaultStyleAbs(machine.ui); 
            }
            attrs.forEach((a) => {
                if (a.name == 'type') return;
                machine.propChange(a.name);
            })
        }
        let children = Array.prototype.slice.call(node.children);
        children.forEach((element) => {
            cycleCreateLinker(element);
        })
    }

    let preGC = function(node){
        MutationObser.gcpool.append(node);
    }

    let topSetup = function () {
        let global = document.querySelector('#MutationObser');
        let gcpool = document.querySelector('#MutationObser-gc');
        Object.assign(MutationObser, { global, gcpool });
        obs(global);
        global.addEventListener('observe', topObser);
        let machine = new linkUImachine(global);
        machine.new();
        machine.ui.destroy = function (){}; 
        MutationObser.globalSx = 1;
        MutationObser.globalSy = 1;
        resize();
        window.addEventListener('resize', resize);
        let alert = [
        "此插件一般用于UI而非小物件如角色精灵拓展",
        "240125 不再处理h5标签相对PIXIUI的偏移, 这意味着改变图片锚点或坐标为负值时h5标签的位置不会对齐PIXIUI",
        "一般来说, 使用此插件的Hit类来判定交互范围和h5自带的交互事件已经完全足够处理任何交互事件, 而不需要单独处理交互的更新",
        "框架底层实现限制: h5标签的尺寸被UI的边界强制覆盖, UI的位置则被h5标签的位置强制覆盖, 如此来实现各类布局和文本驱动",
        ]
        if(console.groupCollapsed && MutationObser.params.secondMode != 'true'){
            let mes = '';
            alert.forEach((m)=>{  mes += '\n  ! ' + m });
            console.groupCollapsed(`%c  [MutationObser]  %c%s`, 'color:#ffffff;background:#aa0000', 'font-weight:normal;color:#614108;background:#fffbe6;', mes);
            console.groupEnd();
        }
    }

    let resize = function(){
        let gw = Graphics._width;
        let gh = Graphics._height;
        let gww = Number(Graphics._canvas.style.width.replace('px', ''));
        let ghh = Number(Graphics._canvas.style.height.replace('px', ''));
        let sx = gww / gw;
        let sy = ghh / gh;
        MutationObser.globalSx = sx;
        MutationObser.globalSy = sy;
        MutationObser.global.style.width = gw + 'px';
        MutationObser.global.style.height = gh + 'px';
        MutationObser.global.style.transform = `scale(${sx}, ${sy})`;
        let rect = Graphics._canvas.getBoundingClientRect();
        MutationObser.global.style.left = `${rect.x}px`;
        MutationObser.global.style.top = `${rect.y}px`;
        MutationObser.global.refreshBounds = true;
    }

    let staticMethodCall = function (mutationsList, observer) {
        this.___tempMutationInfo = {};
        Object.assign(this.___tempMutationInfo, { mutationsList, observer });
        this.dispatchEvent(MutationObser._observeEV_);
        delete this.___tempMutationInfo;
    }

    let obs = function (node, config) {
        if (!node) return;
        config = config || {
            childList: true,
            subtree: true,
            attributes: true
        }
        let observer = new MutationObserver(staticMethodCall.bind(node));
        observer.observe(node, config);
        return observer;
        // observer.disconnect();
    }

    Object.assign(MutationObser, { obs, staticMethodCall, preGC, resize });
})();

// 核心 单向绑定UI到dom树
let linkUImachine = function () { this.initialize.apply(this, arguments) };
linkUImachine.prototype.constructor = linkUImachine;
(() => {

    linkUImachine.prototype.initialize = function (node) {
        node.linkUImachine = this;
        this.node = node;
    }

    let cantUpdate = function(ui){
        let parent = ui.parent || { renderable: true };
        let renderable = ui.renderable && parent.renderable;
        return !renderable && !ui.isMask;
    }

    let update = function (ui) {
        if(!ui) return;
        if(cantUpdate(ui)) return;
        if(ui.linkUImachine){
            ui.linkUImachine.update();
        }
        if(ui.update){
            ui.update();
        }
        ui.children.forEach((u) => {
            update(u);
        })
    }

    doneUpdate = function(){
        if(!MutationObser.global) return;
        if(!MutationObser.global.linkUImachine) return;
        if(!MutationObser.global.linkUImachine.ui) return;
        MutationObser.globalRect = MutationObser.global.getBoundingClientRect();
        update(MutationObser.global.linkUImachine.ui);
        MutationObser.binding.update();
        if(MutationObser.reFocus){
            MutationObser.reFocus--;
        }
    }
    
    let Scene_Base_update = Scene_Base.prototype.update;
    Scene_Base.prototype.update = function () {
        Scene_Base_update.call(this, ...arguments);
        doneUpdate();
    }

    // 核心 重要同步
    linkUImachine.prototype.update = function () {
        
        if(this.waiting){
            this.waiting--;
            this.ui.emit('waiting');
            return;
        }
        this.ui.emit('update');
        if(this.node == MutationObser.global) {
            this.clientRect = new PIXI.Rectangle(0, 0, Graphics.width, Graphics.height);
            this.bounds = this.clientRect;
            this.global = { x:0, y: 0 }; 
            return;
        }
        this._sync0();
        // 同步 html节点和UI节点 边界 无条件逐帧
        this._syncBounds(this.clientRect, this.clientRectParent);
        // 同步 html节点和UI节点 样式 无条件逐帧
        this._syncStyle();
        // 同步 其它
        this._syncOthers();

    }

    // linkUImachine.prototype.canUpdate = function(){
    //     if (!this.ui) return;
    //     if (!this.ui.renderable && !this.ui.isMask) return;
    //     return true;
    //     let renderableFixing = this.ui.renderableFixing;
    //     if(this.ui.renderableFixing == 0){
    //         this.ui.renderableFixing++;
    //     }
    //     if (renderableFixing) return;
    //     return true;
    // }
    
    linkUImachine.prototype._sync0 = function(){
        
        this.style = this.node.style;

        this.clientRect = new PIXI.Rectangle();

        let x = this.node.offsetLeft;
        let y = this.node.offsetTop;
        Object.assign( this.clientRect, { x, y } );

        let parent = this.node.parentElement;
        if(parent.linkUImachine){
            let global = parent.linkUImachine.global;
            let x = global.x + this.clientRect.x;
            let y = global.y + this.clientRect.y;
            this.global = { x, y };
        }

        // this.offsetRecordX = (Number(this.node.getAttribute('offsetx'))  || 0);
        // this.offsetRecordY = (Number(this.node.getAttribute('offsety'))  || 0);
    }

    linkUImachine.prototype._syncOffset = function(){
        let parent = this.node.parentElement;
        if(parent.linkUImachine){
            let bounds = parent.linkUImachine.bounds;
            let x = this.bounds.x - bounds.x;
            let y = this.bounds.y - bounds.y;
            this.local = { x, y };
            this.offset = { x: this.node.offsetLeft - this.local.x, y: this.node.offsetTop - this.local.y };
        }
    }

    // 240111 各种偏移适配
    linkUImachine.prototype._applyOffset = function(){
        
        if(this.local && this.offset.x){
            this.node.style.left = ( this.node.offsetLeft - this.offset.x) + 'px';
            this.offsetRecordX += this.offset.x;
            this.node.setAttribute('offsetx', this.offsetRecordX || 0);
        }
        if(this.local && this.offset.y){
            this.node.style.top = ( this.node.offsetTop - this.offset.y) + 'px';
            this.offsetRecordY += this.offset.y;
            this.node.setAttribute('offsety', this.offsetRecordY || 0);
        } 
    }

    linkUImachine.prototype._syncBounds = function(rect, rectParent){
        
        this._syncCoor();
        // this.ui.x += this.offsetRecordX;
        // this.ui.y += this.offsetRecordY;

        this.bounds = this.ui.getBounds();
        // this._syncOffset();
        
        Object.assign(this.clientRect, { width:this.bounds.width, height:this.bounds.height });
        // 尺寸
        this.node.style.width = this.clientRect.width + 'px';
        this.node.style.height = this.clientRect.height + 'px';

    }

    linkUImachine.prototype._syncCoor = function(){
        // 坐标
        this.ui.x = this.node.offsetLeft;
        this.ui.y = this.node.offsetTop;
    }

    linkUImachine.prototype._syncFont = function (style, oStyle) {
        if(!(this.ui instanceof PIXI.Text)) return;
        let ui = this.ui;
        let st = ui.style;
        st.fontFamily = style.fontFamily.replace(/"/g, '');
        st.fontWeight = Number(style.fontWeight);
        st.fontSize = Number(style.fontSize.replace('px', ''));
        st.fill = style.color;
        let a = style.textAlign;
        if (a == 'start') {
            st.align = 'left';
        } else if (a == 'end') {
            st.align = 'right';
        } else {
            st.align = a;
        }
        st.stroke = oStyle.outlineColor;
        st.strokeThickness = Number(oStyle.outlineWidth.replace('px', ''));
    }

    linkUImachine.prototype._syncStyle = function () {
        let style = window.getComputedStyle(this.node);
        this.style = style;
        let oStyle = this.node.style;
        let ui = this.ui;
        // 通用样式
        ui.alpha = Number(style.opacity);
        ui.visible = (style.visibility == 'visible');
        ui.renderable = (style.display != 'none');
        ui.renderableFixing = (style.display == 'none' ? 0 : undefined);
        // 文字样式
        this._syncFont(style, oStyle);
        // UI拓展
        let ax = style.getPropertyValue('--ax');
        let ay = style.getPropertyValue('--ay');
        let sx = style.getPropertyValue('--sx');
        let sy = style.getPropertyValue('--sy');
        if(ax.length){
            this.ui.anchor.x = Number(ax);
        }
        if(ay.length){
            this.ui.anchor.y = Number(ay);
        }
        if(sx.length){
            this.ui.scale.x = Number(sx);
        }
        if(sy.length){
            this.ui.scale.y = Number(sy);
        }
    }

    linkUImachine.prototype._syncOthers = function () {
        if((this.ui instanceof PIXI.Container) && (!this.ui.uvs)){
            this.ui.pivot.x = Math.round((this.bounds.width / this.ui.scale.x) * this.ui.anchor.x);
            this.ui.pivot.y = Math.round((this.bounds.height / this.ui.scale.y) * this.ui.anchor.y);
        }
        if(this.ui instanceof PIXI.Sprite && !(this.ui instanceof PIXI.Text)){
            // url兼容
            if(this.ui.base64Url){
                MutationObser.commons.loadTex(this.ui.base64Url, (t)=>{
                    this.ui.base64Url = null;
                    this.ui.texture = t;
                    this.ui.on('update', this.ui._textureValidPost);
                })
            }
            else{
                let url = this.node.getAttribute('url');
                if(!url || /^data:/i.test(url)) return;
                let path = this.ui.texture.baseTexture.imageUrl || '';
                let regex = new RegExp(url.replace(/\.\//, ''), 'i');
                if(regex.test(path) || this.requestingUrl) return;
                this.requestingUrl = url;
                MutationObser.commons.loadTex(this.requestingUrl, (t)=>{
                    this.requestingUrl = null;
                    this.ui.texture = t;
                    this.ui.on('update', this.ui._textureValidPost);
                })
            }
        }
        return;
    }
    
    linkUImachine.prototype.new = function () {
        let ui;
        let node = this.node;
        let parent = node.parentElement;
        let type = node.getAttribute('type');
        if (!type) {
            ui = new PIXI.Container();
        } else if (type == 'sprite') {
            ui = new PIXI.Sprite();
        } else if (type == 'graphics') {
            ui = new PIXI.Graphics();
        } else if (type == 'text') {
            ui = new PIXI.Text();
            ui.updateTextFlag = 'mutation';
        }
        let old = this.ui;
        this.ui = ui;
        if (old && old.parent) {
            old.parent.removeChild(old);
        }
        if (parent && parent.linkUImachine) {
            let children = Array.prototype.slice.call(parent.children);
            let i = children.indexOf(node);
            parent.linkUImachine.ui.addChildAt(this.ui, i);
            this._syncCoor();
        }
        ui.linkUImachine = this;
        ui.last = { };
        if(!ui.anchor){
            ui.anchor = { x:0, y:0 };
        }
    }
    linkUImachine.prototype.childListChange = function () {
        let node = this.node;
        let parent = node.parentElement;
        let mach = parent.linkUImachine;
        if (!parent || !mach) return;
        let children = Array.prototype.slice.call(parent.children);
        let i = children.indexOf(node);
        mach.ui.addChildAt(this.ui, i);
        this._syncCoor();
    }
    linkUImachine.prototype.refreshFrame = function (index, pw, ph) {
        let ui = this.ui;
        let b = ui.texture.baseTexture;
        let cols = (b.width / pw);
        let x = (index % cols) * pw;
        let y = Math.floor(index / cols) * ph;
        let frame = new PIXI.Rectangle(x, y, pw, ph);
        if (x + pw > b.width || y + ph > b.height) {
            console.warn("裁切过大");
            return;
        }
        ui.texture.frame = frame;
        return true;
    }
    linkUImachine.prototype.propChange = function (prop) {
        try {
            let value = this.node.getAttribute(prop);
            let style = this.ui.style || {};
            //绑定处理
            if (/^ev$/i.test(prop)) {
                return this.propChange4EV(prop, value);
            } 
            else if (/^bind$/i.test(prop)) {
                return this.propChange4Binding(prop, value);
            }
            else if (/^type$/i.test(prop)) {
                this.new();
            }
            // UI处理
            else if (/^icon$/i.test(prop)) {
                value = value.split(/\s+/i);
                let index = Number(value[0]);
                let pw = Number(value[1]);
                let ph = Number(value[2]) || pw;
                this.ui.on('wait-tex', this.refreshFrame.bind(this, index, pw, ph));

            } 
            else if (/^text$/i.test(prop)) {
                value = value.replace(/\\n/g, '\n');
                this.ui.text = getPossibleText(value);
            } 
            else if (/^shape$/i.test(prop)) {
                if(!(this.ui instanceof PIXI.Graphics)) return;
                this.ui.clear();
                value = value.split(/\s+/);
                let type = value.shift();
                MutationObser.commons.processShape.call(this.ui, type, value);
            }
        } catch (e) {
            console.warn(e);
        }
    }

    let getPossibleText = function(text){
        if(MutationObser.params.dk1 && typeof(DKTools) != 'undefined' && DKTools.Localization != undefined){
            if(text && !/^\{/i.test(text)){
                text = '{' + text;
            }
            if(text && !/\}$/i.test(text)){
                text = text + '}';
            }
            return DKTools.Localization.getText(text);
        }
        return text;
    }

    
    
    //事件处理
    linkUImachine.prototype.propChange4EV = function (prop, value) {
        
    }

    //绑定处理
    linkUImachine.prototype.propChange4Binding = function (prop, value) {
        value = value.split(/\s*;\s*|\s*；\s*/gi);
        if(!value.length) return;
        let data = MutationObser.binding;
        // 移除所有绑定
        for(let key in data){
            let data1 = data[key];
            for(let prop in data1){
                if(/^__/i.test(prop)) continue;
                let nodes = data1[prop];
                let index = nodes.indexOf(this.node);
                nodes.splice(index, 1);
            } 
        }
        // 重新所有绑定
        value.forEach((v) => {
            v = v.split(/\s*:\s*|\s*：\s*/i);
            let p = v[0];
            let b = v[1];
            MutationObser.binding[b] = MutationObser.binding[b] || { __now:null };
            MutationObser.binding[b][p] = MutationObser.binding[b][p] || [];
            let source = MutationObser.binding[b];
            let props = MutationObser.binding[b][p];
            let __id = 0, __type = 2;
            if(/^v(\d+)/i.test(b)){
                __id = Number(/^v(\d+)/i.exec(b)[1]);
                __type = 0;
            }
            else if(/^s(\d+)/i.test(b)){
                __id = Number(/^s(\d+)/i.exec(b)[1]);
                __type = 1;
            }
            Object.assign(source, { __id, __type });
            if(props.indexOf(this.node) >= 0) return;
            props.push(this.node);
            MutationObser.binding.sync([this.node], p, source.__now);
        })
    }

   
    // 数据绑定
    let bindingLite = function () { };
    bindingLite.prototype.constructor = bindingLite;
    bindingLite.prototype.update = function(){
        if(!$gameVariables) return;
        let gc = [];
        let vv = $gameVariables._data;
        let ss = $gameSwitches._data;
        for (const [key, value] of Object.entries(this)) {
            if(value.__type == 0){
                this.sync0(vv, value.__id, value);
            }
            else if(value.__type == 1){
                this.sync0(ss, value.__id, value);
            }
        }
    }
    bindingLite.prototype.sync0 = function(source, id, value){
        if(source[id] != value.__now){
            value.__now = source[id];
            for(let prop in value){
                if(/__now/i.test(prop)) continue;
                this.sync(value[prop]||[], prop, value.__now);
            }
        }
    }
    bindingLite.prototype.sync = function(nodes, prop, value){
        for(let i=0; i<nodes.length; i++){
            let n = nodes[i];
            if(/^url$|^text$|^icon$|^shape$/i.test(prop)){
                n.setAttribute(prop, value);
            }
            else{
                n.style[prop] = this.translate(n, prop, value);
            }
        }
    }
    bindingLite.prototype.translate = function(n, prop, value){
        if(/^left$|^top$|^outline-width$/i.test(prop)){
            return (value + 'px');
        }
        else if(/^display$/i.test(prop)){
            let style = window.getComputedStyle(n);
            if(style.display != 'none'){
                n.lastDisplay = style.display;
            }
            let display = (value ? (n.lastDisplay || 'block') : 'none');
            if(display != 'none' && n.linkUImachine){
                n.linkUImachine.ui.renderable = true;
                n.linkUImachine.ui.renderableFixing = undefined;
            }
            return display; 
        }
        else if(/^visibility$/i.test(prop)){
            return (value ? 'visible' : 'hidden'); 
        }
        else if(/^opacity$/i.test(prop)){
            return Number(value); 
        }
        return value;
    }

   Object.assign(MutationObser, { linkUImachine, bindingLite, binding: new bindingLite(), cantUpdate });

})();

// 外置预设
//预设原型工厂
(()=>{
    MutationObser.presetsProto = MutationObser.presetsProto || { };
    let DefineFactory = function(_class){
        _class.Public.forEach((name)=>{
            Object.defineProperty(_class.prototype, name, {
                get: function(){ 
                    if(this[`Get${name}`]){
                        return this[`Get${name}`]();
                    }
                    return this[`_${name}`];
                },
                set: function(v){
                    let none = `On${name}`;
                    let change = `On${name}Change`;
                    if(this[none]){
                        this[none]();
                        this.ev ? this.ev.emit(none) : 0;
                    }
                    if(v != this[`_${name}`] && this[change]){
                        this[change](v);
                        this.ev ? this.ev.emit(change, v) : 0;
                    }
                }
            })
        })
        MutationObser.presetsProto[_class.name] = _class;
    }
    Object.assign(MutationObser, { DefineFactory });
})();
(()=>{

    let presets = { };
    let app = new PIXI.Application();
    let load = function(res){
        let doc = MutationObser.dom.parseFromString(res, 'text/html');
        let top = doc.getElementById('global');
        for (let i = 0; i < top.children.length; i++) {
            let id = top.children[i].id;
            presets[id] = {
                el: top.children[i],
                res: null,
            }
        }
        let preprocessPrest = function(presets){
            for(let id in presets){
                let info = presets[id];
                extalPresetLoad(info);
            }
        }
        preprocessPrest(presets);
    }

    let extalPresetLoad = function(info){
        let type = info.el.getAttribute('type');
        if(/^filter$/i.test(type)){
            presetFilter(info);
        }
        else if(!type || /^ui$/i.test(type)){
            ;
        }
    }

    let fixProcessFilterMZ = function(tf, vert, frag){
        let u = makeUserUniforms(tf.program.uniformData);
        let defaultUniforms = JSON.parse(JSON.stringify(u));
        let ntf = new PIXI.Filter(vert, frag, u);
        ntf.defaultUniforms = defaultUniforms;
        return ntf;
    }

    let makeUserUniforms = function(data){
        let u = { };
        for(let name in data){
            if(!/^u_/i.test(name)) continue;
            let value = (data[name].value == undefined ? data[name] : data[name].value);
            let v = value;
            if(value[0] != undefined){
                v = [];
                value.forEach((el)=>{
                    v.push(el);
                })
            }
            u[name] = v;
        }
        return u;
    }

    let presetFilter = function(info){
        let done = function(vert, frag){ 
            if(!vert && !frag) return;
            if(!/\.glsl$|\.vert$/i.test(vert) && !/\.glsl$|\.frag$/i.test(frag)){
                if(!/varying vec2 uv/i.test(frag)){
                    console.log(info.el.id, `检查到着色器缺少 uv = aVertexPosition; 和 varying vec2 uv; 处理, 注意uv对齐`);
                }
                let tf = new PIXI.Filter(vert, frag);
                tf.defaultUniforms = JSON.parse(JSON.stringify(makeUserUniforms(tf.uniforms)));
                // 231220 BY MZ的滤镜必须初始化uniform否则【无视】着色器uniform编译
                MutationObser.mzFlag ? ( tf = fixProcessFilterMZ(tf, vert, frag) ) : null;
                info.res = tf;
                // 通用编译测试
                let test = new PIXI.Shader( app.renderer.gl, tf.vertexSrc, tf.fragmentSrc );
                return info.res;
            }
        }
        let vert = info.el.getElementsByTagName('vert')[0];
        let frag = info.el.getElementsByTagName('frag')[0];
        frag = frag.innerText.trim() || frag.getAttribute('src');
        if(!frag) return;
        vert = vert.innerText.trim() || vert.getAttribute('src') || PIXI.Filter.defaultVertSrc;
        let res = done(vert, frag);
        if(res) return res;
        if(/\.glsl|\.vert/i.test(vert)){
            MutationObser.spliceResReload(vert, 'text/plain', (res)=>{
                vert = res;
                done(vert, frag);
            })
        }
        if(/\.glsl|\.frag/i.test(frag)){
            MutationObser.spliceResReload(frag, 'text/plain', (res)=>{
                frag = res;
                done(vert, frag);
            })
        }
    }

    let clonePreset = function(res){
        if(typeof(res) == 'string'){
            return clonePreset(MutationObser.presets[res].res);
        }
        else if(res instanceof PIXI.Filter){
            let vert = MutationObser.mzFlag ? res.program.vertexSrc : res.vertexSrc;
            let frag = MutationObser.mzFlag ? res.program.fragmentSrc : res.fragmentSrc;
            let u = JSON.parse(JSON.stringify(res.defaultUniforms));
            let u1 = JSON.parse(JSON.stringify(res.defaultUniforms));
            vert = vert.replace(/#define\s*SHADER_NAME.+/gi, '');
            frag = frag.replace(/#define\s*SHADER_NAME.+/gi, '');
            let tf = new PIXI.Filter(vert, frag, u1);
            tf.defaultUniforms = u;
            return tf;
        }
        else if(res instanceof HTMLElement){
            // let f = new PIXI.Filter(res.vertexSrc, res.fragmentSrc, res.defaultUniforms);
            // return f;
        }
    }

    // let Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    // Scene_Map.prototype.createDisplayObjects = function(){
    //     Scene_Map_createDisplayObjects.call(this, ...arguments);
    //     // testFilter(this);
    // }

    Object.assign(MutationObser, { presets, clonePreset, });
    
    MutationObser.spliceResReload('./obs/MutationObser-preset.html', 'text/html', load);
})();

// 一般方法
(()=>{
    let commons = { };

    let destroy = function(el){
        console.log(el, `延迟销毁开始, 务必保证代码不会继续引用该节点及其linkUImachine`);
        // let id = setTimeout(()=>{

        // }) TODO
    }

    let loadTex = function(value, cb){
        if(/^data:/i.test(value)){
            let img = new Image();
            img.src = value;
            let t = PIXI.Texture.from(img);
            cb ? cb(t) : null;
            return t;
        }
        let base = new PIXI.BaseTexture();
        let t = new PIXI.Texture(base);
        let bitmap = Bitmap.load(value);
        bitmap.addLoadListener(() => {
            let tex = PIXI.Texture.from(bitmap._image.src).clone();
            PIXI.Texture.call(t, tex);
            cb ? cb(t) : null;
        })
        return t;
    }

    let clone = function (el) {
        if(!el) return;
        else if(el instanceof PIXI.Container){
            return clone(el.linkUImachine.node);
        }
        else if(typeof(el) == 'string'){
            return clone(document.getElementById(el));
        }

        let newEl = document.createElement(el.tagName);
        for (let i = 0; i < el.attributes.length; i++) {
            let attr = el.attributes[i];
            newEl.setAttribute(attr.name, attr.value);
        }
        newEl.removeAttribute('id');
        newEl.innerHTML = el.innerHTML;

        return newEl;
    }

    let evtest = function (e) {
        e.path;
        e.currentTarget;
    }

    let rgbToHex = function(color){
        function fn(r, g, b) {
            // 将一个十进制数字转换为两位十六进制数
            function toHex(n) {
                return n.toString(16).padStart(2, '0');
            }
        
            // 转换 RGB 分量并拼接
            return '0x' + toHex(r) + toHex(g) + toHex(b);
        }
        let v = color.match(/(\d+)/g);
        if(!v || !v.length) return;
        let r = fn(Number(v[0]), Number(v[1]), Number(v[2]));
        return r;
        
    }

    let Fixer = function(e){
        if(MutationObser.reFocus) return;
        MutationObser.reFocus = 2;
        let cycle = function(fn, el){
            let children = Array.prototype.slice.call(el.children);
            children.forEach((el) => {
                cycle(fn, el);
            })
            if(el != MutationObser.global){
                fn(el);
            }
        }
        // cycle(FixBounds, MutationObser.global);
    }

    let processShape = function(type, values){
        if(/^rect$/i.test(type)){
            let w = Number(values[0]);
            let h = Number(values[1]) || w;
            this.beginFill(this.fill.color || 0x000000, 1);
            this.drawRect(0, 0, w, h);
        }
        else if(/^roundrect$/i.test(type)){
            let w = Number(values[0]);
            let h = Number(values[1]);
            let r = Number(values[2]) || 8;
            this.beginFill(this.fill.color || 0x000000, 1);
            this.drawRoundedRect(0, 0, w, h, r);
        }
        else if(/^circle$/i.test(type)){
            let r = Number(values[0]) || 20;
            this.beginFill(this.fill.color || 0x000000, 1);
            this.drawCircle(0, 0, r);
        }
        else if(/^poly$/i.test(type)){
            this.beginFill(this.fill.color || 0x000000, 1);
            // this.drawPolygon(...values);
        }
    }

    // document.body.addEventListener('pointerenter', Fixer);

    Object.assign( commons, { loadTex, clone, evtest, rgbToHex, Fixer, processShape });
    Object.assign( MutationObser, { commons });

})();

// 模型集合 如 状态机 层级树
(()=>{
    // 鼠标按下聚焦 选择 取消选择 
    let collectionViewsUpdater = function(){
        let item = this.selectItem;
        if(!item) return;
        if(this.lastSelectItem != this.selectItem){
          if(this.lastSelectItem){
            this.emit('itemunselect', this.lastSelectItem);
            if(this.lastSelectItem._focusing){
              this.emit('itemlostfocusing', this.lastSelectItem);
            }
            this.lastSelectItem._focusing = false;
          }
          // (this.applyItemUnSelect && this.lastSelectItem) ? this.applyItemUnSelect(this.lastSelectItem) : 0;
          this.lastSelectItem = this.selectItem;
          this.emit('itemselect', this.selectItem);
        }
        let newScaleFlag = CFInputExtend.isMouseTriggered() && (item._hovered || item._focusing);
        if(newScaleFlag){
          if(!item._focusing){
            // console.log(item);
            this.emit('itemfocusing', item);
            // this.applyItemFocusing ? this.applyItemFocusing(item) : 0;
          }
          item._focusing = true;
        }
        else{
          if(item._focusing){
            this.emit('itemlostfocusing', item);
            // this.applyItemNoFocusing ? this.applyItemNoFocusing(item) : 0;
          }
          item._focusing = false;
        }
    }

    // 窗口抽象逻辑
    let WindowAbstract = function () { this.initialize.apply(this, arguments) };
    WindowAbstract.prototype = Object.create(PIXI.DisplayObject.EventEmitter.prototype);
    WindowAbstract.prototype.constructor = WindowAbstract;

    WindowAbstract.prototype.initialize = function(parent){
        PIXI.DisplayObject.EventEmitter.call(this, ...arguments);
        this._active = false;
        this.parent = parent;
        this.data = { };
        this.on('active', ()=>{
            this._active = true;
        })
        this.on('deactive', ()=>{
            this._active = false;
        })
    }

    let Hit = function () { this.initialize.apply(this, arguments) };
    Hit.prototype = Object.create(PIXI.DisplayObject.EventEmitter.prototype);
    Hit.prototype.constructor = Hit;

    Hit.prototype.initialize = function(){
        PIXI.DisplayObject.EventEmitter.call(this, ...arguments);
        this.hit = false;
    }

    Hit.prototype.check = function(poly){
        if(poly instanceof HTMLElement && poly.linkUImachine && poly.linkUImachine.ui){
            return this.check(poly.linkUImachine.ui);
        }
        let collided;
        if(poly.vertexData){
            let vd = poly.vertexData;
            let rect = [];
            for(let i=0; i<vd.length; i+=2){
              rect.push( { x:vd[i], y:vd[i+1] } );
            }
            let x = TouchInput._x;
            let y = TouchInput._y;
            let pointerRect = [
              { x:x, y:y },
              { x:x+1, y:y },
              { x:x+1, y:y+1 },
              { x:x, y:y+1 },
            ]
            collided = polygonStatic.polygonsCollide(rect, pointerRect);
        }
        else{
            let rect = poly.getBounds();
            collided = rect.contains(this.x, this.y);
        }
        this.hit = collided;
        return collided;
    }

    let Vector2 = { };
    Vector2.dot = function(vector1, vector2){
        return vector1.x * vector2.x + vector1.y * vector2.y;
    }
    Vector2.sub = function(vector1, vector2){
        return { x: vector1.x - vector2.x, y: vector1.y - vector2.y };
    }
    Vector2.normal = function(vector1){
        return { x: -vector1.y, y: vector1.x };
    }

    let polygonStatic = { };
    polygonStatic.getNormals = function (edges) {
        // 计算多边形的法线
        const normals = [];
        for (const edge of edges) {
            const normal = Vector2.normal(edge);
            normals.push(normal);
        }
        return normals;
    }

    polygonStatic.projectPolygon = function (polygon, axis) {
        // 在指定轴上投影多边形并返回投影线段的最小和最大值
        let min, max;
        min = max = Vector2.dot(polygon[0], axis);
        for (let i = 1; i < polygon.length; i++) {
            const projection = Vector2.dot(polygon[i], axis);
            if (projection < min) {
                min = projection;
            }
            if (projection > max) {
                max = projection;
            }
        }
        return { min, max };
    }

    polygonStatic.polygonsCollide = function (polygon1, polygon2) {
        // 计算多边形的边和法线
        const edges1 = [];
        for (let i = 0; i < polygon1.length; i++) {
            const edge = Vector2.sub(polygon1[(i + 1) % polygon1.length], polygon1[i]);
            edges1.push(edge);
        }

        const edges2 = [];
        for (let i = 0; i < polygon2.length; i++) {
            const edge = Vector2.sub(polygon2[(i + 1) % polygon2.length], polygon2[i]);
            edges2.push(edge);
        }

        const normals = polygonStatic.getNormals(edges1).concat(polygonStatic.getNormals(edges2));

        // 检测是否存在分离轴
        for (const normal of normals) {
            const proj1 = polygonStatic.projectPolygon(polygon1, normal);
            const proj2 = polygonStatic.projectPolygon(polygon2, normal);
            if (proj1.max < proj2.min || proj2.max < proj1.min) {
                return false; // 存在分离轴，多边形不相交
            }
        }

        return true; // 所有轴上都没有分离，多边形相交
    }

    Object.assign(MutationObser, { WindowAbstract, Hit, Vector2, polygonStatic });
})();

//兼容-PIXI.Text
(()=>{
    

    // 可拓展转义支持
    let TextFormatter = function () {
        this.clear();
    }
    TextFormatter.prototype.clear = function () {
        this.recorder = {};
        this.assigner = {};
    }
    TextFormatter.prototype.recordThatChar = function (char) {
        return '{\u27A4' + char + '}';
    }
    TextFormatter.prototype.recordThatFormat = function (name, value) {
        let num = Number(value);
        if (!isNaN(num)) {
            value = num;
        }
        let obj = {};
        obj[name] = value || true;
        return obj;
    }
    TextFormatter.R_FONT = {
        fillStyle: /\\c\[(\d+)\]/gi,
        italic: /\\fi/gi,
        reset: /\\fr/gi,
        face: /\\fn\<(.+)\>/gi,
        size: /\\fs\[(\d+)\]/gi,
        bold: /\\fb/gi,
        oColor: /\\oc\[(\d+)\]/gi,
        oWidth: /\\ow\[(\d+)\]/gi,
        // break: /\\n/gi,
        // break: /\<br\>/gi,
    }
    TextFormatter.R_DATA = {
        state: /\\it\[(\d+)\]/gi
    }
    TextFormatter.textColor = function (n) {
        return ColorManager.textColor(n);
    }
    TextFormatter.prototype.exec = function (text) {
        this.clear();
        let font = TextFormatter.R_FONT;
        this.counter = 0;
        for (let key in font) {
            text = this.execAdvance(text, font[key], key);
        }
        let data = TextFormatter.R_DATA;
        for (let key in data) {
            text = this.execAdvance(text, data[key], key);
        }
        text = this.afterExec(text);
        this.text = text;
        this.counter = 0;
        this.style = new PIXI.TextStyle();
        return text;
    }
    TextFormatter.prototype.execAdvance = function (text, re, name) {
        while ((match = re.exec(text)) !== null) {
            let recordChar = this.recordThatChar(this.counter);
            this.recorder[recordChar] = this.recordThatFormat(name, match[1]);
            text = text.replace(match[0], recordChar);
            this.counter++;
        }
        return text;
    }
    TextFormatter.prototype.afterExec = function (text) {
        let re = /{\u27A4\d+}/i;
        while ((match = re.exec(text)) !== null) {
            let i = text.indexOf(match[0]);
            this.assigner[i] = this.assigner[i] || {};
            Object.assign(this.assigner[i], this.recorder[match[0]]);
            text = text.replace(match[0], '');
        }
        return text;
    }

    Object.assign(MutationObser, { TextFormatter, textFormatter:new TextFormatter() });

    let temp = '\\c[15]\na\nbc\\fisss\\oc[1]一二三\\fs[55]www';
    let tt = MutationObser.textFormatter.exec(temp);
    console.log(MutationObser.textFormatter, tt);

    // 文字更新方法
    let PIXI_updateText = PIXI.Text.prototype.updateText;
    PIXI.Text.prototype.updateText = function(){
        if(/mutation/i.test(this.updateTextFlag)){
            return updateText.call(this, ...arguments);
        }
        PIXI_updateText.call(this, ...arguments);
    }   

    Object.defineProperty(PIXI.Text.prototype, "updateTextFlag", {
        get: function () {
            return this._updateTextFlag;
        },
        set: function (flag) {
            if(this.style){
                this.style.styleID++;
            }
            this._updateTextFlag = flag;
        },
    })

    let processEscape = function(){
        this.textFormatter = this.textFormatter || new TextFormatter();
        this.textFormatter.exec(this._text);
    }

    let updateText = function(respectDirty){
        var style = this._style;

        // check if style has changed..
        if (this.localStyleID !== style.styleID) {
            this.dirty = true;
            this.localStyleID = style.styleID;
        }

        if (!this.dirty && respectDirty) {
            return;
        }
        //240125 转义
        processEscape.call(this);
        Object.assign(this.textFormatter.style, this._style);
        this._font = this._style.toFontString();
        let text = this.textFormatter.text;

        var context = this.context;
        var measured = PIXI.TextMetrics.measureText(text, this._style, this._style.wordWrap, this.canvas);
        var width = measured.width;
        var height = measured.height;
        var lines = measured.lines;
        
        var lineHeight = measured.lineHeight;
        var lineWidths = measured.lineWidths;
        var maxLineWidth = measured.maxLineWidth;
        var fontProperties = measured.fontProperties;

        this.canvas.width = Math.ceil((width + style.padding * 2) * this.resolution);
        this.canvas.height = Math.ceil((height + style.padding * 2) * this.resolution);

        context.scale(this.resolution, this.resolution);

        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        context.font = this._font;
        context.strokeStyle = style.stroke;
        context.lineWidth = style.strokeThickness;
        context.textBaseline = style.textBaseline;
        context.lineJoin = style.lineJoin;
        context.miterLimit = style.miterLimit;

        var linePositionX = void 0;
        var linePositionY = void 0;

        if (style.dropShadow) {
            context.fillStyle = style.dropShadowColor;
            context.globalAlpha = style.dropShadowAlpha;
            context.shadowBlur = style.dropShadowBlur;

            if (style.dropShadowBlur > 0) {
                context.shadowColor = style.dropShadowColor;
            }

            var xShadowOffset = Math.cos(style.dropShadowAngle) * style.dropShadowDistance;
            var yShadowOffset = Math.sin(style.dropShadowAngle) * style.dropShadowDistance;

            for (var i = 0; i < lines.length; i++) {
                linePositionX = style.strokeThickness / 2;
                linePositionY = style.strokeThickness / 2 + i * lineHeight + fontProperties.ascent;

                if (style.align === 'right') {
                    linePositionX += maxLineWidth - lineWidths[i];
                } else if (style.align === 'center') {
                    linePositionX += (maxLineWidth - lineWidths[i]) / 2;
                }

                if (style.fill) {
                    this.drawLetterSpacing(lines[i], linePositionX + xShadowOffset + style.padding, linePositionY + yShadowOffset + style.padding);

                    if (style.stroke && style.strokeThickness) {
                        context.strokeStyle = style.dropShadowColor;
                        this.drawLetterSpacing(lines[i], linePositionX + xShadowOffset + style.padding, linePositionY + yShadowOffset + style.padding, true);
                        context.strokeStyle = style.stroke;
                    }
                }
            }
        }

        // reset the shadow blur and alpha that was set by the drop shadow, for the regular text
        context.shadowBlur = 0;
        context.globalAlpha = 1;

        // set canvas text styles
        context.fillStyle = this._generateFillStyle(style, lines);

        // draw lines line by line
        for (var _i = 0; _i < lines.length; _i++) {
            linePositionX = style.strokeThickness / 2;
            linePositionY = style.strokeThickness / 2 + _i * lineHeight + fontProperties.ascent;

            if (style.align === 'right') {
                linePositionX += maxLineWidth - lineWidths[_i];
            } else if (style.align === 'center') {
                linePositionX += (maxLineWidth - lineWidths[_i]) / 2;
            }

            if (style.stroke && style.strokeThickness) {
                this.drawLetterSpacing(lines[_i], linePositionX + style.padding, linePositionY + style.padding, true);
            }

            if (style.fill) {
                this.drawLetterSpacing(lines[_i], linePositionX + style.padding, linePositionY + style.padding);
            }

            this.textFormatter.counter++;
        }

        this.updateTexture();
    }

    let drawLetterSpacing = function(text, x, y, isStroke){
        if (isStroke === void 0) { isStroke = false; }
        var style = this._style;
        //
        var letterSpacing = style.letterSpacing;
        
        var currentPosition = x;
        
        var stringArray = Array.from ? Array.from(text) : text.split('');
        var previousWidth = this.context.measureText(text).width;
        var currentWidth = 0;
        for (var i = 0; i < stringArray.length; ++i) {
            let es = processEscapeInStringArray.call(this);
            if(es){
                this.context;
            }
            var currentChar = stringArray[i];
            if (isStroke) {
                this.context.strokeText(currentChar, currentPosition, y);
            }
            else {
                this.context.fillText(currentChar, currentPosition, y);
            }
            let style = this.textFormatter.style;
            currentWidth += this.context.measureText(currentChar).width + letterSpacing;
            // currentWidth += PIXI.TextMetrics.measureText(currentChar, style, style.wordWrap, this.canvas).width + letterSpacing;
            // console.log(currentWidth);
            // currentWidth = this.context.measureText(text.substring(i + 1)).width;
            currentPosition = currentWidth;
            // currentPosition += previousWidth - currentWidth + letterSpacing;
            // previousWidth = currentWidth;
        }
    }

    let processEscapeInStringArray = function(){
        let i = this.textFormatter.counter++;
        if(!this.textFormatter.assigner[i]) return;
        let data = this.textFormatter.assigner[i];
        let style = this.textFormatter.style;
        for(let p in data){
            if(/fillStyle/i.test(p)){
                this.context.fillStyle = TextFormatter.textColor(data[p]);
            }
            else if(/size/i.test(p)){
                style.fontSize = data[p];
            }
            else if(/italic/i.test(p)){
                style.fontStyle = 'italic';
            }
            else if(/bold/i.test(p)){
                style.fontWeight = 'bold';
            }
        }
        this.context.font = style.toFontString();
        return true;
    }

    let PIXI_drawLetterSpacing = PIXI.Text.prototype.drawLetterSpacing;
    PIXI.Text.prototype.drawLetterSpacing = function (text, x, y, isStroke) {
        if(/mutation/i.test(this.updateTextFlag)){
            return drawLetterSpacing.call(this, ...arguments);
        }
        PIXI_drawLetterSpacing.call(this, ...arguments);
    }

    Object.assign( MutationObser, { updateText });
})();
//兼容-PIXI.Sprite
(()=>{
    PIXI.Sprite.prototype._textureValidPost = function(){
        let width = this.texture.baseTexture.width;
        if(width > 0){
            this.emit('wait-tex');
            this.off('update', this._textureValidPost);
        }
    }
})();

