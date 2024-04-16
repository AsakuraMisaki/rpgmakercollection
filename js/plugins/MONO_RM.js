
(() => {
    var global = typeof(self) != 'undefined' ? global = self : typeof(global) != 'undefined' ? global = global : typeof(window) != 'undefined' ? global=window : typeof(globalThis) != 'undefined' ? global = globalThis : void 0; 
    
    var canstart = false;

    var load = function(){
        canstart = true;
        // global.dispatchEvent('monoLoad');

        const MONO = global.MONO;

        var UI = MONO.UI;

        Scene_Base.updateMono = Scene_Base.prototype.update;
        Scene_Base.prototype.update = function () {
            Scene_Base.updateMono.call(this);
            UI.Tracer.update();
        }

        SceneManager._updateInputDataMono = SceneManager.updateInputData;
        SceneManager.updateInputData = function () {
            SceneManager._updateInputDataMono.call(this);
            UI.Touch.update();
            UI.Input.update();
        }

        let TextFormatter = UI.TextFormatter;
        TextFormatter.textColor = function (n) {
            var px = 96 + (n % 8) * 12 + 6;
            var py = 144 + Math.floor(n / 8) * 12 + 6;
            return ImageManager._imageCache._items['img/system/Window.png:0'].bitmap.getPixel(px, py);
        }

    }

    
    let path = './mono/';
    //comlink
    let comlink = document.createElement('script');
    comlink.src = `${path}comlink.js`;
    document.body.appendChild(comlink);
    comlink.addEventListener('load', ()=>{
        let script = document.createElement('script');
        script.src = `${path}runtime.js`;
        script.type = "module";
        document.body.appendChild(script);
        script.addEventListener('load', load);
    });

    Scene_Boot.isReady_mono = Scene_Boot.prototype.isReady;
    Scene_Boot.prototype.isReady = function(){
        let ready = Scene_Boot.isReady_mono.call(this, ...arguments);
        return ready && canstart;
    }


    if(debug = true){
        //1017编辑器
        
        Graphics._createAllElementsMono = Graphics._createAllElements;
        Graphics.__updateCanvasOrig = Graphics._updateCanvas;
        Graphics._createAllElements = function(){
            Graphics._createAllElementsMono.call(this, ...arguments);
            global.$monoEditor = null;
            let gui = require('nw.gui');
            gui.Window.open("./mono.html", function(newWindow){
                global.$monoEditor = newWindow;
                global.$monoEditor.window.runtime = window;
            }.bind(this));
        } 

        let SceneManager_onKeyDown = SceneManager.onKeyDown;
        SceneManager.onKeyDown = function(event) {
            if (!event.ctrlKey && !event.altKey && event.keyCode == 116 && global.$monoEditor) {
                global.$monoEditor.close();
            }
            SceneManager_onKeyDown.call(this, ...arguments);     
        };

        // Graphics._updateCanvasMono = function(){
        //     this._canvas.width = this._width;
        //     this._canvas.height = this._height;
        //     this._canvas.style.zIndex = 1;
        //     this._canvas.style.marginLeft = Graphics._width/2 + 'px';
        // }
        
    }

})();