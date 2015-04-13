var sinon = require('sinon');
var assert = require('assert');
var Module = require('module');
var Promise = require('promise');

describe('Page', function () {

    it('should apply active class when show() is called', function () {
        var Page = require('page');
        var pageInstance = new Page();
        return pageInstance.show().then(function () {
            assert.ok(pageInstance.el.classList.contains('page-active'), 'generated page div now has active class');
            pageInstance.destroy();
        });
    });

    it('should be assigned an el that has a "page" class on instantiation', function () {
        var Page = require('page');
        var pageContainerEl = document.createElement('div');
        var pageInstance = new Page({el: pageContainerEl});
        var generatedPageEl = pageContainerEl.getElementsByClassName('page')[0];
        return pageInstance.show().then(function () {
            assert.ok(pageInstance.el.classList.contains('page'), 'el was assigned that has a class name of "page"');
            pageInstance.destroy();
        });
    });

    it('should call Module prototype\'s show() when show() is called', function () {
        var Page = require('page');
        var moduleShowStub = sinon.stub(Module.prototype, 'show').returns(Promise.resolve());
        var moduleLoadStub = sinon.stub(Module.prototype, 'load').returns(Promise.resolve());
        var pageInstance = new Page({el: document.createDocumentFragment()});
        return pageInstance.show().then(function () {
            assert.equal(moduleShowStub.callCount, 1, 'modules prototype show method was called');
            pageInstance.destroy();
            moduleLoadStub.restore();
            moduleShowStub.restore();
        });
    });

    it('should call Module prototype\'s hide() when hide() is called', function () {
        var Page = require('page');
        var moduleHideStub = sinon.stub(Module.prototype, 'hide').returns(Promise.resolve());
        var moduleLoadStub = sinon.stub(Module.prototype, 'load').returns(Promise.resolve());
        var pageInstance = new Page({el: document.createDocumentFragment()});
        return pageInstance.hide().then(function () {
            assert.equal(moduleHideStub.callCount, 1, 'modules prototype hide method was called');
            pageInstance.destroy();
            moduleLoadStub.restore();
            moduleHideStub.restore();
        });
    });
});