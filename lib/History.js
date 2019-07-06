'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LS = void 0;
if ("localStorage" in window) {
    try {
        LS = window.localStorage;
    } catch (e) {
        //如果报错，说明浏览器已经关闭了本地存储
    }
}


var noop = function noop() {};
/**
 * 恢复和撤销操作，利用本地存储进行数据管理
 * */

var History = function () {
    function History(_ref) {
        var key = _ref.key,
            namespace = _ref.namespace,
            _ref$maxStack = _ref.maxStack,
            maxStack = _ref$maxStack === undefined ? 100 : _ref$maxStack,
            _ref$delay = _ref.delay,
            delay = _ref$delay === undefined ? 500 : _ref$delay;

        _classCallCheck(this, History);

        this.LSKey = 'HISTORY_' + namespace + '_' + key;
        this.namespace = namespace;
        this.maxStack = maxStack;
        this.delay = delay;
        this.lastChangeTime = Date.now();
        this.recordListener = noop;
        this.oldData = {};
        this._init();
    }

    _createClass(History, [{
        key: '_init',
        value: function _init() {
            try {
                this._deleteLocal();
                if (!(this.LSKey in LS)) {
                    this._setLSData({ undo: [], redo: [] });
                }
            } catch (e) {
                // json.stringify失败
            }
        }

        // 新开一个页面的时候，将同一namespace下的其他页面本地存储清空

    }, {
        key: '_deleteLocal',
        value: function _deleteLocal() {
            var _this = this;

            Object.keys(LS).forEach(function (key) {
                var reg = new RegExp('HISTORY_' + _this.namespace);
                if (reg.test(key) && key !== _this.LSKey) {
                    localStorage.removeItem(key);
                }
            });
        }
    }, {
        key: '_change',
        value: function _change(source, dest) {
            var stack = this._getLSData();
            if (stack[source].length === 0) return false;
            var data = stack[source].pop();
            stack[dest].push(data);
            this._setLSData(stack);
            return data;
        }
    }, {
        key: 'record',
        value: function record(data) {
            try {
                if (Date.now() - this.lastChangeTime >= this.delay) {
                    var stack = JSON.parse(LS.getItem(this.LSKey));
                    var storeData = { id: _shortid2.default.generate(), data: data };
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
    }, {
        key: 'undo',
        value: function undo(fn) {
            if (this.canUndo()) {
                var data = this._change('undo', 'redo');
                while (data && data.id === this.oldData.id) {
                    data = this._change('undo', 'redo');
                }
                if (data) {
                    this.oldData = data || {};
                    fn(data.data);
                }
            }
        }
    }, {
        key: 'redo',
        value: function redo(fn) {
            if (this.canRedo()) {
                var data = this._change('redo', 'undo');
                while (data && data.id === this.oldData.id) {
                    data = this._change('redo', 'undo');
                }
                if (data) {
                    this.oldData = data || {};
                    fn(data.data);
                }
            }
        }
    }, {
        key: 'canUndo',
        value: function canUndo() {
            var stack = this._getLSData();
            return stack && stack.undo.length;
        }
    }, {
        key: 'canRedo',
        value: function canRedo() {
            var stack = this._getLSData();
            return stack && stack.redo.length;
        }
    }, {
        key: '_getLSData',
        value: function _getLSData() {
            try {
                return JSON.parse(LS.getItem(this.LSKey));
            } catch (e) {
                // 格式不正确
            }
        }
    }, {
        key: '_setLSData',
        value: function _setLSData(stack) {
            try {
                LS.setItem(this.LSKey, JSON.stringify(stack));
            } catch (e) {
                // 格式不正确
            }
        }

        /**设置保存数据回调*/

    }, {
        key: 'setRecordListener',
        value: function setRecordListener(fn) {
            this.recordListener = fn;
        }
    }, {
        key: 'clear',
        value: function clear() {
            this._setLSData({ undo: [], redo: [] });
            this.oldData = {};
        }
    }]);

    return History;
}();

exports.default = History;