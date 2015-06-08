var sinon = require('sinon');
var assert = require('assert');
var Module = require('module.js');
var Promise = require('promise');
var Page = require('./../src/page');
var ElementKit = require('element-kit');

describe('Page', function () {


    it('calling load() should set a page class onto page\'s element', function () {
        var pageInstance = new Page();
        var pageEl = document.createElement('div');
        return pageInstance.load({el: pageEl}).then(function () {
            assert.ok(pageEl.classList.contains('page'));
            pageInstance.destroy();
        });
    });

    it('should set page element passed into load call as the page\'s el', function () {
        var pageInstance = new Page();
        var pageEl = document.createElement('div');
        return pageInstance.load({el: pageEl}).then(function () {
            assert.equal(pageEl, pageInstance.el);
            pageInstance.destroy();
        });
    });

    it('should call Module prototype\'s load() when load() is called', function () {
        var moduleLoadStub = sinon.stub(Module.prototype, 'load').returns(Promise.resolve());
        var pageInstance = new Page({pagesContainer: document.createDocumentFragment()});
        var pageEl = document.createElement('div');
        var loadOptions = {el: pageEl};
        return pageInstance.load(loadOptions).then(function () {
            assert.deepEqual(moduleLoadStub.args[0][0], loadOptions, 'modules prototype load method was called with options passed into load call');
            pageInstance.destroy();
            moduleLoadStub.restore();
        });
    });

    it('should apply active class to page element passed into load call when show() is called', function () {
        var pageInstance = new Page();
        var pageEl = document.createElement('div');
        return pageInstance.load({el: pageEl}).then(function () {
            return pageInstance.show().then(function () {
                assert.ok(pageEl.classList.contains('page-active'));
                pageInstance.destroy();
            });
        });
    });

    it('after showing, active class should be removed immediately when hide() is called', function () {
        var pageInstance = new Page();
        var pageEl = document.createElement('div');
        return pageInstance.load({el: pageEl}).then(function () {
            return pageInstance.show().then(function () {
                pageInstance.hide();
                assert.ok(!pageEl.classList.contains('page-active'), 'active class has been removed');
                pageInstance.destroy();
            });
        });
    });

    it('should call Module prototype\'s show() when show() is called', function () {
        var moduleShowStub = sinon.stub(Module.prototype, 'show').returns(Promise.resolve());
        var pageInstance = new Page({pagesContainer: document.createDocumentFragment()});
        var pageEl = document.createElement('div');
        return pageInstance.load({el: pageEl}).then(function () {
            return pageInstance.show().then(function () {
                assert.equal(moduleShowStub.callCount, 1, 'modules prototype show method was called');
                pageInstance.destroy();
                moduleShowStub.restore();
            });
        });
    });

    it('should call Module prototype\'s hide() when hide() is called', function () {
        var moduleHideStub = sinon.stub(Module.prototype, 'hide').returns(Promise.resolve());
        var pageInstance = new Page({pagesContainer: document.createDocumentFragment()});
        var pageEl = document.createElement('div');
        return pageInstance.load({el: pageEl}).then(function () {
            return pageInstance.hide().then(function () {
                assert.equal(moduleHideStub.callCount, 1, 'modules prototype hide method was called');
                pageInstance.destroy();
                moduleHideStub.restore();
            });
        });
    });

    it('should call Module prototype\'s load() after initial transition has completed on page element', function () {
        var moduleLoadStub = sinon.stub(Module.prototype, 'load').returns(Promise.resolve());
        var pageInstance = new Page({pagesContainer: document.createDocumentFragment()});
        var pageEl = document.createElement('div');
        var elementKitWaitForTransitionStub = sinon.stub(pageEl.kit, 'waitForTransition');
        var loadOptions = {el: pageEl};
        pageInstance.load(loadOptions);
        assert.equal(moduleLoadStub.callCount, 0, 'modules prototype load method was not yet called because page hasnt been transitioned yet');
        elementKitWaitForTransitionStub.yield();
        assert.deepEqual(moduleLoadStub.args[0][0], loadOptions, 'after page element transitions, modules prototype load method was called with options passed into load call');
        elementKitWaitForTransitionStub.restore();
        pageInstance.destroy();
        moduleLoadStub.restore();
    });

});