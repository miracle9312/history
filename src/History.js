'use strict';

let LS;
if( "localStorage" in window ){
    try{
        LS = window.localStorage;
    }catch(e){
        //如果报错，说明浏览器已经关闭了本地存储
    }
}
import shortid from 'shortid';

const noop = () => {};
/**
 * 恢复和撤销操作，利用本地存储进行数据管理
 * */
export default class History {
    constructor({ key, namespace, maxStack = 100, delay = 500 }) {
        this.LSKey = `HISTORY_${namespace}_${key}`;
        this.namespace = namespace;
        this.maxStack = maxStack;
        this.delay = delay;
        this.lastChangeTime = Date.now();
        this.recordListener = noop;
        this.oldData = {};
        this._init();
    }

    _init() {
        try{
            this._deleteLocal();
            if(!(this.LSKey in LS)) {
                this._setLSData({undo:[], redo: []});
            }
        }catch(e) {
            // json.stringify失败
        }
    }

    // 新开一个页面的时候，将同一namespace下的其他页面本地存储清空
    _deleteLocal () {
        Object.keys(LS).forEach(key => {
            const reg = new RegExp(`HISTORY_${this.namespace}`)
            if(reg.test(key) && key !== this.LSKey) {
                localStorage.removeItem(key)
            }
        })
    }

    _change(source, dest) {
        const stack = this._getLSData();
        if (stack[source].length === 0) return false;
        let data = stack[source].pop();
        stack[dest].push(data);
        this._setLSData(stack);
        return data;
    }

    record(data) {
        try {
            if(Date.now() - this.lastChangeTime >= this.delay) {
                const stack = JSON.parse(LS.getItem(this.LSKey));
                const storeData = {id: shortid.generate(), data};
                this.oldData = storeData;
                stack.undo.push(storeData);
                // 有新操作时清空redo队列
                stack.redo = [];
                if (stack.undo.length > this.maxStack) {
                    stack.undo.shift();
                }
                this._setLSData(stack);
                this.lastChangeTime = Date.now();
                this.recordListener();
            }
        } catch (e) {
            //
        }
    }

    undo(fn) {
        if(this.canUndo()) {
            let data = this._change('undo', 'redo');
            while(data && data.id === this.oldData.id) {
                data = this._change('undo', 'redo');
            }
            if(data) {
                this.oldData = data || {};
                fn(data.data);
            }
        }
    }

    redo(fn) {
        if(this.canRedo()) {
            let data = this._change('redo', 'undo');
            while(data && data.id === this.oldData.id) {
                data = this._change('redo', 'undo');
            }
            if(data) {
                this.oldData = data || {};
                fn(data.data);
            }
        }
    }

    canUndo() {
        const stack = this._getLSData();
        return stack && stack.undo.length;
    }

    canRedo() {
        const stack = this._getLSData();
        return stack && stack.redo.length;
    }

    _getLSData() {
        try {
            return JSON.parse(LS.getItem(this.LSKey))
        }catch(e){
            // 格式不正确
        }
    }

    _setLSData(stack) {
        try {
            LS.setItem(this.LSKey, JSON.stringify(stack));
        }catch(e) {
            // 格式不正确
        }
    }

    /**设置保存数据回调*/
    setRecordListener(fn) {
        this.recordListener = fn;
    }

    clear() {
        this._setLSData({undo:[], redo: []});
        this.oldData = {};
    }
}
