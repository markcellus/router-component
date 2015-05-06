var sinon = require('sinon');
var assert = require('assert');
var Module = require('module.js');
var Promise = require('promise');
var Page = require('./../src/page');

describe('Page', function () {

    it('should apply active class when show() is called', function () {
        var pageInstance = new Page();
        return pageInstance.show().then(function () {
            assert.ok(pageInstance.el.classList.contains('page-active'), 'generated page div now has active class');
            pageInstance.destroy();
        });
    });

    it('after showing, active class should be removed immediately when hide() is called', function () {
        var pageInstance = new Page();
        return pageInstance.show().then(function () {
            pageInstance.hide();
            assert.ok(!pageInstance.el.classList.contains('page-active'), 'active class has been removed');
            pageInstance.destroy();
        });
    });

    it('should be assigned an el that has a "page" class on instantiation', function () {
        var pageContainerEl = document.createElement('div');
        var pageInstance = new Page({pagesContainer: pageContainerEl});
        var generatedPageEl = pageContainerEl.getElementsByClassName('page')[0];
        return pageInstance.show().then(function () {
            assert.ok(pageInstance.el.classList.contains('page'), 'el was assigned that has a class name of "page"');
            pageInstance.destroy();
        });
    });

    it('should call Module prototype\'s show() when show() is called', function () {
        var moduleShowStub = sinon.stub(Module.prototype, 'show').returns(Promise.resolve());
        var moduleLoadStub = sinon.stub(Module.prototype, 'load').returns(Promise.resolve());
        var pageInstance = new Page({pagesContainer: document.createDocumentFragment()});
        return pageInstance.show().then(function () {
            assert.equal(moduleShowStub.callCount, 1, 'modules prototype show method was called');
            pageInstance.destroy();
            moduleLoadStub.restore();
            moduleShowStub.restore();
        });
    });

    it('should call Module prototype\'s hide() when hide() is called', function () {
        var moduleHideStub = sinon.stub(Module.prototype, 'hide').returns(Promise.resolve());
        var moduleLoadStub = sinon.stub(Module.prototype, 'load').returns(Promise.resolve());
        var pageInstance = new Page({pagesContainer: document.createDocumentFragment()});
        return pageInstance.hide().then(function () {
            assert.equal(moduleHideStub.callCount, 1, 'modules prototype hide method was called');
            pageInstance.destroy();
            moduleLoadStub.restore();
            moduleHideStub.restore();
        });
    });
});