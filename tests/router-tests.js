var sinon = require('sinon');
var ResourceManager = require('resource-manager-js');
var assert = require('assert');
var Promise = require('promise');
var Page = require('../src/page');
var Module = require('../src/module');
var _ = require('underscore');
var Listen = require('listen-js');
var Router = require('./../src/router');

describe('Router', function () {
    'use strict';
    var mockPage, mockModule,
        origPushState,
        requireStub;

    var createPageStub = function (cls) {
        var page = sinon.createStubInstance(cls);
        page.getTemplate.returns(Promise.resolve('<div class="page"></div>'));
        page.load.returns(Promise.resolve());
        page.hide.returns(Promise.resolve());
        page.show.returns(Promise.resolve());
        page.getStyles.returns(Promise.resolve());
        page.fetchData.returns(Promise.resolve());
        return page;
    };

    beforeEach(function () {
        // disable spawning of new urls when testing!
        origPushState = window.history.pushState;
        window.history.pushState = function () {};

        sinon.spy(Listen, 'createTarget');
        sinon.spy(Listen, 'destroyTarget');

        // set up mock page and set defaults
        mockPage = createPageStub(Page);
        // setup module and set defaults
        mockModule = sinon.createStubInstance(Module);
        mockModule.getTemplate.returns(Promise.resolve());
        mockModule.load.returns(Promise.resolve());
        mockModule.show.returns(Promise.resolve());
        mockModule.hide.returns(Promise.resolve());
        mockModule.getStyles.returns(Promise.resolve());
        mockModule.fetchData.returns(Promise.resolve());

        requireStub = sinon.stub(window, 'require');

        // dont trigger any popstate events!
        sinon.stub(window, 'addEventListener');

    });

    afterEach(function () {

        Listen.createTarget.restore();
        Listen.destroyTarget.restore();

        window.history.pushState = origPushState;
        window.addEventListener.restore();
        requireStub.restore();
    });

    it('should call Listen.createTarget on initialize to attach all event handling logic', function () {
        var router = require('./../src/router');
        router.start();
        assert.deepEqual(Listen.createTarget.args[0][0], router, 'Router instance was passed to Listen.createTarget');
        router.stop();
    });

    it('should call Listen.destroyTarget on stop to detach all event handling logic', function () {
        var router = require('./../src/router');
        router.start({});
        assert.equal(Listen.destroyTarget.callCount, 0);
        router.stop();
        assert.deepEqual(Listen.destroyTarget.args[0][0], router, 'Router instance was passed to Listen.destroyTarget');
    });

    it('should return query params from provided url', function () {
        var router = require('./../src/router');
        router.start({});
        var url = 'http://my-testable-url.com/my/testable/path/?my=little&tea=pot';
        var queryParams = router.getQueryParams(url);
        assert.deepEqual({'my': 'little', 'tea': 'pot'}, queryParams, 'query params parsed from url: ' + JSON.stringify(queryParams));
        router.stop();
    });

    it('should return query params from current window url', function () {
        var router = require('./../src/router');
        sinon.stub(router, 'getWindow').returns({location: {
            href: 'http://my-testable-url.com/my/testable/path/?my=little&tea=pot',
            hash: ''
        }});
        router.start({});
        var queryParams = router.getQueryParams();
        assert.deepEqual({'my': 'little', 'tea': 'pot'}, queryParams, 'query params parsed from url: ' + JSON.stringify(queryParams));
        router.stop();
        router.getWindow.restore();
    });

    it('should fire a url change event when a url is triggered', function () {
        var router = require('./../src/router');
        router.start({});
        var url = 'my/testable/url';
        var urlChangeSpy = sinon.spy();
        router.addEventListener('url:change', urlChangeSpy);
        router.triggerRoute(url);
        assert.equal(urlChangeSpy.callCount, 1, 'url change spy was called when url is triggered');
        router.removeEventListener('url:change', urlChangeSpy);
        router.stop();
    });

    it('should reject the triggerRoute() promise when trying to trigger a url that has not been specified in the route config', function () {
        var router = require('./../src/router');
        router.start({});
        var url = 'my/testable/url';
        return router.triggerRoute(url)
            .then(function () {
                throw new Error('error should exist');
            }, function (err) {
                router.stop();
                assert.ok(err, 'triggerRoute returns with an error message because no url match in route config');
            });
    });

    it('should call pushState with correct path when triggering url', function () {
        var url = 'my/testable/url';
        var router = require('./../src/router');
        var pagesConfig = {};
        pagesConfig[url] = {};
        requireStub.withArgs(url).returns(mockPage);
        var window = {
            history: {
                pushState: sinon.stub()
            },
            location: {
                hash: ''
            }
        };
        var getWindowStub = sinon.stub(router, 'getWindow').returns(window);
        router.start({
            pagesConfig: pagesConfig
        });
        return router.triggerRoute(url)
            .then(function () {
                assert.equal(window.history.pushState.args[0][0].path, url, 'history.pushState() was called with correct data history');
                assert.equal(window.history.pushState.args[0][2], url, 'history.pushState() was called with correct url parameter');
                router.stop();
                getWindowStub.restore();
            });
    });

    it('should use a fallback page instance when there is no script specified for a page in the route config', function () {
        // setup
        var pageUrl = 'my/index/with/no/script/url';
        var dataUrl = 'get/my/data';
        var pagesConfig = {};
        pagesConfig[pageUrl] = {
            data: dataUrl
        };
        var mockData = {};
        mockPage.getTemplate.returns();
        mockPage.fetchData.returns(Promise.resolve(mockData));
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig
        });
        var pageInitializeSpy = sinon.spy(Page.prototype, 'initialize');
        var showPageStub = sinon.stub(router, 'showPage').returns(Promise.resolve());
        var pageGetDataStub = sinon.stub(Page.prototype, 'fetchData').returns(Promise.resolve({}));
        return router.triggerRoute(pageUrl)
            .then(function () {
                assert.equal(pageInitializeSpy.callCount, 1, 'fallback page instance was initialized');
                assert.deepEqual(requireStub.callCount, 0, 'no script require() call was made');
                pageInitializeSpy.restore();
                pageGetDataStub.restore();
                router.stop();
                showPageStub.restore();
            });
    });

    it('should use a fallback Module instance when there is no script specified for a module in the route config', function () {
        // setup
        var pageUrl = 'my/index/with/no/script/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var pageScript = 'path/to/myscript';
        modulesConfig[moduleName] = {};
        pagesConfig[pageUrl] = {
            script: pageScript,
            modules: [moduleName]
        };
        var moduleInitializeSpy = sinon.spy(Module.prototype, 'initialize');
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScript).returns(mockPage);
        var showPageStub = sinon.stub(router, 'showPage').returns(Promise.resolve());
        return router.triggerRoute(pageUrl)
            .then(function () {
                assert.equal(moduleInitializeSpy.callCount, 1, 'fallback Module instance was initialized');
                router.stop();
                moduleInitializeSpy.restore();
                showPageStub.restore();
            });
    });

    it('should call page\'s getTemplate method with template url specified in routes configuration', function () {
        // setup
        var pageUrl = 'url/to/page/with/template';
        var pageScriptUrl = 'my/page/script';
        var templateUrl = 'path/to/my/tmpl.html';
        var pagesConfig = {};
        pagesConfig[pageUrl] = {
            template: templateUrl,
            script: pageScriptUrl
        };
        var mockTemplate = '<div></div>';
        var router = require('./../src/router');
        router.start({pagesConfig: pagesConfig});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockPage.getTemplate.withArgs(templateUrl).returns(Promise.resolve(mockTemplate));
        return router.triggerRoute(pageUrl)
            .then(function () {
                assert.deepEqual(mockPage.getTemplate.args[0], [templateUrl], 'template url was passed to resource manager\'s loadTemplate() method');
                router.stop();
            });
    });

    it('should pass the data property of the matching route config of the url requested to the associated page\'s fetchData() method', function (done) {
        // setup
        var pageUrl = 'my/real/url';
        var dataUrl = 'get/my/data';
        var pageScriptUrl = 'da/script';
        var pagesConfig = {};
        pagesConfig[pageUrl] = {
            data: dataUrl,
            script: pageScriptUrl
        };
        var mockData = {};
        mockPage.fetchData.returns(Promise.resolve(mockData));
        var router = require('./../src/router');
        router.start({pagesConfig: pagesConfig});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        router.triggerRoute(pageUrl)
            .then(function () {
                assert.deepEqual(mockPage.fetchData.args[0][0], dataUrl, 'page instance\'s fetchData() method was passed requested url');
                assert.deepEqual(mockPage.fetchData.args[0][1], {cache: true}, 'page instance\'s fetchData() method was passed an object with cache set to true');
                router.stop();
                done();
            })
            .catch(done);
    });

    it('should fire a page load event when a url is triggered', function () {
        // setup
        var router = require('./../src/router');
        var pageUrl = 'my/page/load/event/url';
        var pagesConfig = {};
        pagesConfig[pageUrl] = {};
        requireStub.withArgs(pageUrl).returns(mockPage);
        router.start({pagesConfig: pagesConfig});
        var pageLoadSpy = sinon.spy();
        router.addEventListener('page:load', pageLoadSpy);
        return router.triggerRoute(pageUrl).then(function () {
            assert.equal(pageLoadSpy.callCount, 1, 'url change spy was called when url is triggered');
            router.removeEventListener('page:load', pageLoadSpy);
            router.stop();
        });
    });

    it('should call the load method of the page entry in the route config that has a regex', function () {
        // setup
        var router = require('./../src/router');
        var pageUrl = 'test/url';
        var pagesConfig = {};
        pagesConfig[pageUrl + '(/)?$'] = {my: 'stuff'};
        router.start({pagesConfig: pagesConfig});
        mockPage.getTemplate.returns(Promise.resolve());
        mockPage.load.returns(Promise.resolve());
        mockPage.show.returns(Promise.resolve());
        mockPage.fetchData.returns(Promise.resolve());
        requireStub.withArgs(pageUrl).returns(mockPage);
        router.triggerRoute(pageUrl).then(function () {
            assert.equal(mockPage.load.callCount, 1, 'module load was called');
            router.stop();
        });
    });

    it('should pass any options object specified for a module in routes config to the module\'s instantiation', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'myCustomModule';
        var moduleOptions = {my: 'moduleOptions'};
        var moduleScriptUrl = 'path/to/module/script';
        var pageScriptUrl = 'path/to/page/script';
        modulesConfig[moduleName] = {
            script: moduleScriptUrl,
            options: moduleOptions
        };
        pagesConfig[pageUrl] = {
            script: pageScriptUrl,
            modules: [moduleName]
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        var pageClass = sinon.stub().returns(mockPage);
        requireStub.withArgs(pageScriptUrl).returns(pageClass);

        var moduleInitializeStub = sinon.stub().returns(mockModule);
        requireStub.withArgs(moduleScriptUrl).returns(moduleInitializeStub);
        router.triggerRoute(pageUrl).then(function () {
            assert.deepEqual(moduleInitializeStub.args[0][0], moduleOptions,  'module was instantiated with custom options');
            router.stop();
        });
    });

    it('should pass page level data to submodules load() call', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'myCustomModule';
        var moduleOptions = {my: 'moduleOptions'};
        var moduleScriptUrl = 'path/to/module/script';
        var pageData = {page: 'customPageData here'};
        var moduleHtml = '<div>{{page}}</div>';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            script: moduleScriptUrl,
            options: moduleOptions,
            template: moduleTemplateUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            script: pageScriptUrl,
            modules: [moduleName],
            template: pageTemplateUrl
        };
        var mockPage = new Page({el: document.createElement('div')});
        var pageShowStub = sinon.stub(mockPage, 'show').returns(Promise.resolve());
        var pageLoadStub = sinon.stub(mockPage, 'load').returns(Promise.resolve());
        var pageGetDataStub = sinon.stub(mockPage, 'fetchData').returns(Promise.resolve(pageData));
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        var pageClass = sinon.stub().returns(mockPage);
        requireStub.withArgs(pageScriptUrl).returns(pageClass);
        var CustomModule = Module.extend({
            load: sinon.stub().returns(Promise.resolve()),
            getTemplate: sinon.stub().returns(Promise.resolve(moduleHtml))
        });
        requireStub.withArgs(moduleScriptUrl).returns(CustomModule);
        router.triggerRoute(pageUrl).then(function () {
            assert.deepEqual(CustomModule.prototype.load.args[0][0].data, pageData,  'sub module\'s load() was called with page level data');
            pageLoadStub.restore();
            pageShowStub.restore();
            pageGetDataStub.restore();
            router.stop();
        });
    });

    it('should fire a page error event when there is no config setup for a requested url', function () {
        // setup
        var router = require('./../src/router');
        var pageUrl = 'my/page/load/event/url';
        router.start({pagesConfig: {}});
        var pageErrorSpy = sinon.spy();
        router.addEventListener('page:error', pageErrorSpy);
        return router.triggerRoute(pageUrl).catch(function () {
            assert.equal(pageErrorSpy.args[0][0].type, 'page:error', 'correct error was thrown');
            router.removeEventListener('page:error', pageErrorSpy);
            router.stop();
        });
    });

    it('getting current url params when NO route has been triggered', function () {
        var router = require('./../src/router');
        var path = 'test';
        sinon.stub(router, 'getWindow').returns({location: {hash: '#' + path}, history: {}});
        router.start({pagesConfig: {}});
        assert.deepEqual(router.getRelativeUrlParams(), [path], 'calling getRelativeUrlParams() before triggering a route returns correct url');
        router.stop();
        router.getWindow.restore();
    });

    it('getting current url params when a route has been triggered', function () {
        var router = require('./../src/router');
        var getWindowStub = sinon.stub(router, 'getWindow');
        getWindowStub.returns({
            history: {
                pushState: function(){}
            },
            location: {
                hash: ''
            }
        });
        router.start({pagesConfig: {}});
        var url = 'my/url';
        router.triggerRoute(url);
        assert.deepEqual(router.getRelativeUrlParams(), ['my', 'url'], 'getRelativeUrlParams() returns correct url params of the url that was triggered');
        router.stop();
        getWindowStub.restore();
    });

    it('getting current url when a route has been triggered', function () {
        var router = require('./../src/router');
        router.start({pagesConfig: {}});
        var url = 'my/url';
        router.triggerRoute(url);
        assert.deepEqual(router.getRelativeUrl(), url, 'getRelativeUrl() returns correct url that was triggered');
        router.stop();
    });

    it('getting the current url that contains a leading slash', function () {
        var router = require('./../src/router');
        router.start({pagesConfig: {}});
        var url = '/leading/slash/url';
        router.triggerRoute(url);
        assert.deepEqual(router.getRelativeUrl(), 'leading/slash/url', 'getRelativeUrl() returns the url without the slash');
        router.stop();
    });

    it('should call loadPage() with new url when pop state changes', function (done) {
        var router = require('./../src/router');
        var popStateListener = window.addEventListener.withArgs('popstate');
        var loadPageStub = sinon.stub(router, 'loadPage');
        router.start({pagesConfig: {}});
        var url = 'my/url';
        var event = {state: {path: url}};
        popStateListener.callArgWith(1, event); // trigger pop state event!
        // must wait until promise for custom route handling resolves
        _.delay(function () {
            assert.equal(loadPageStub.args[0][0], url, 'loadPage() was called with new pop state url');
            router.stop();
            loadPageStub.restore();
            done();
        }, 10);
    });

    it('loadPage() should pass the styles property of the matching route config of the url requested to the associated page\'s getStyles() method', function () {
        // setup
        var pageUrl = 'my/real/url';
        var pageScriptUrl = 'path/to/page/script';
        var stylesUrls = ['get/my/data'];
        var pagesConfig = {};
        pagesConfig[pageUrl] = {script: pageScriptUrl, styles: stylesUrls};
        var router = require('./../src/router');
        router.start({pagesConfig: pagesConfig});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        var showPageStub = sinon.stub(router, 'showPage').returns(Promise.resolve());
        return router.loadPage(pageUrl)
            .then(function () {
                assert.deepEqual(mockPage.getStyles.args[0], [stylesUrls], 'page instance\'s getStyles() method was passed with correct style paths');
                router.stop();
                showPageStub.restore();
            });
    });

    it('registerUrl() method should call window.history.pushState() with correct parameters', function () {
        var pageUrl = 'my/real/url';
        var router = require('./../src/router');
        var window = {
            history: {
                pushState: sinon.stub()
            },
            location: {
                hash: ''
            }
        };
        var getWindowStub = sinon.stub(router, 'getWindow').returns(window);
        router.start();
        router.registerUrl(pageUrl);
        assert.equal(window.history.pushState.args[0][2], pageUrl, 'pushState was called with new url');
        router.stop();
        getWindowStub.restore();
    });

    it('registerUrl() method should push current window state to Router\'s history', function () {
        var pageUrl = 'my/real/url';
        var router = require('./../src/router');
        router.start();
        var testHistoryState = {my: 'new window state'};
        sinon.stub(router, 'getWindow').returns({
            history: {
                pushState: sinon.stub(),
                state: testHistoryState
            }
        });
        router.registerUrl(pageUrl);
        assert.deepEqual(router.history[0], testHistoryState);
        router.stop();
        router.getWindow.restore();
    });

    it('registerUrl() method should return the registered url as the current path', function () {
        var pageUrl = 'my/real/url';
        var router = require('./../src/router');
        router.start();
        router.registerUrl(pageUrl);
        assert.equal(router.getRelativeUrl(), pageUrl);
        router.stop();
    });

    it('should load an intercepted url path via onRouteRequest callback instead of the original requested url', function () {
        var router = require('./../src/router');
        var secondTestUrl = 'my/second/url';
        var firstPageUrl = 'my/real/url';
        var secondPageRouteRegex = '^' + secondTestUrl;
        var firstPageRouteRegex = '^' + firstPageUrl;
        var firstPageScriptUrl = 'path/to/my/script.js';
        var secondPageScriptUrl = 'path/to/my/script2.js';
        var pagesConfig = {};
        pagesConfig[firstPageRouteRegex] = {script: firstPageScriptUrl};
        pagesConfig[secondPageRouteRegex] = {script: secondPageScriptUrl};
        var onRouteRequestStub = sinon.stub();
        var loadPageStub = sinon.stub(router, 'loadPage').returns(Promise.resolve());
        router.start({
            pagesConfig: pagesConfig,
            onRouteRequest: onRouteRequestStub
        });
        // redirect to new route
        onRouteRequestStub.returns(Promise.resolve(secondTestUrl));
        return router.triggerRoute(firstPageUrl).then(function () {
            assert.equal(loadPageStub.args[0][0], secondTestUrl, 'loadPage() was called with second url');
            assert.equal(loadPageStub.callCount, 1, 'loadPage() was only called once');
            router.stop();
            loadPageStub.restore();
        });
    });

    it('should register the new url returned by onRouteRequest callback into history', function () {
        var router = require('./../src/router');
        var secondPageUrl = 'my/second/url';
        var firstPageUrl = 'my/real/url';
        var firstPageRouteRegex = '^' + firstPageUrl;
        var secondPageRouteRegex = '^' + secondPageUrl;
        var firstPageScriptUrl = 'path/to/my/script.js';
        var secondPageScriptUrl = 'path/to/my/script2.js';
        var pagesConfig = {};
        pagesConfig[firstPageRouteRegex] = {script: firstPageScriptUrl};
        pagesConfig[secondPageRouteRegex] = {script: secondPageScriptUrl};
        var onRouteRequestStub = sinon.stub();
        var loadPageStub = sinon.stub(router, 'loadPage').returns(Promise.resolve());
        requireStub.withArgs(firstPageScriptUrl).returns(mockPage);
        var registerUrlStub = sinon.stub(router, 'registerUrl');
        router.start({
            pagesConfig: pagesConfig,
            onRouteRequest: onRouteRequestStub
        });
        // redirect to new route
        onRouteRequestStub.returns(Promise.resolve(secondPageUrl));
        return router.triggerRoute(firstPageUrl).then(function () {
            assert.equal(registerUrlStub.args[1][0], secondPageUrl, 'new url was passed to second registerUrl() call');
            router.stop();
            registerUrlStub.restore();
            loadPageStub.restore();
        });
    });

    it('should register the original url into history even if onRouteRequest callback returns a new url', function () {
        var router = require('./../src/router');
        var secondTestUrl = 'my/second/url';
        var firstPageUrl = 'my/real/url';
        var firstPageRouteRegex = '^' + firstPageUrl;
        var secondPageRouteRegex = '^' + secondTestUrl;
        var firstPageScriptUrl = 'path/to/my/script.js';
        var secondPageScriptUrl = 'path/to/my/script2.js';
        var pagesConfig = {};
        pagesConfig[firstPageRouteRegex] = {script: firstPageScriptUrl};
        pagesConfig[secondPageRouteRegex] = {script: secondPageScriptUrl};
        var onRouteRequestStub = sinon.stub();
        requireStub.withArgs(firstPageScriptUrl).returns(mockPage);
        var loadPageStub = sinon.stub(router, 'loadPage').returns(Promise.resolve());
        var registerUrlStub = sinon.stub(router, 'registerUrl');
        router.start({
            pagesConfig: pagesConfig,
            onRouteRequest: onRouteRequestStub
        });
        // redirect to new route
        onRouteRequestStub.returns(Promise.resolve(secondTestUrl));
        return router.triggerRoute(firstPageUrl).then(function () {
            assert.equal(registerUrlStub.args[0][0], firstPageUrl, 'original url was added to history');
            router.stop();
            loadPageStub.restore();
            registerUrlStub.restore();
        });
    });


    it('should call hide method on a previous page when a new page is requested', function () {
        var router = require('./../src/router');
        var firstPageUrl = 'my/page/url';
        var secondPageUrl = 'two/second/page';
        var pagesConfig = {};
        var firstPageScriptUrl = 'path/to/page/script';
        var secondPageScriptUrl = 'second/path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[firstPageUrl] = {
            template: pageTemplateUrl,
            script: firstPageScriptUrl
        };
        pagesConfig[secondPageUrl] = {
            template: pageTemplateUrl,
            script: secondPageScriptUrl
        };
        router.start({pagesConfig: pagesConfig});
        var secondMockPage = createPageStub(Page);
        requireStub.withArgs(firstPageScriptUrl).returns(mockPage);
        requireStub.withArgs(secondPageScriptUrl).returns(secondMockPage);
        return router.triggerRoute(firstPageUrl).then(function () {
            // register first url into window state
            router.history = [{path: firstPageUrl}];
            return router.triggerRoute(secondPageUrl).then(function () {
                assert.equal(mockPage.hide.callCount, 1);
                router.stop();
            });
        });
    });

    it('should wrap the requested page\'s element into a div that is appended to the pages container element', function () {
        // setup
        var router = require('./../src/router');
        var pageUrl = 'my/page/url';
        var pagesConfig = {pagesConfig: {}, modules: {}};
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            script: pageScriptUrl
        };
        var pageHtml = '<div>mypagehtml</div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var pagesContainer = document.createElement('div');
        router.start({
            pagesConfig: pagesConfig,
            pagesContainer: pagesContainer
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        return router.triggerRoute(pageUrl).then(function () {
            assert.equal(pagesContainer.children[0].innerHTML, pageHtml);
            router.stop();
        });
    });

    it('should attach module html to appropriate page\'s el within pages container element', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'myCustomModule';
        var moduleOptions = {my: 'moduleOptions'};
        var moduleScriptUrl = 'path/to/module/script';
        var moduleClassName = 'mod-class';
        var moduleHtml = '<div class="' + moduleClassName + '">my module content</div>';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var pagesEl = document.createElement('div');
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig,
            pagesContainer: pagesEl
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.returns(Promise.resolve(moduleHtml));
        requireStub.withArgs(moduleScriptUrl).returns(mockModule);
        return router.triggerRoute(pageUrl).then(function () {
            var requestedPageEl = pagesEl.children[0];
            assert.equal(requestedPageEl.innerHTML, pageHtml + moduleHtml,  'page html was attached to page\'s el in pages container');
            router.stop();
        });
    });

    it('should attach multiple modules in the same order in which they are specified in routes config', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var firstModuleName = 'myFIRSTCustomModule';
        var firstModuleScriptUrl = 'path/to/module/script';
        var firstModuleHtml = "<div>my module content</div>";
        var firstModuleTemplateUrl = 'url/to/my/template';
        var secondModuleName = 'myCustomModule2';
        var secondModuleScriptUrl = 'path/to/module/script';
        var secondModuleHtml = "<div>my second module content</div>";
        var secondModuleTemplateUrl = 'secon/url/to/my/template';
        modulesConfig[firstModuleName] = {
            template: firstModuleTemplateUrl,
            script: firstModuleScriptUrl
        };
        modulesConfig[secondModuleName] = {
            template: secondModuleTemplateUrl,
            script: secondModuleScriptUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [
                secondModuleName,
                firstModuleName
            ],
            script: pageScriptUrl
        };
        mockPage.getTemplate.returns(Promise.resolve());
        var pagesContainer = document.createElement('div');
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig,
            pagesContainer: pagesContainer
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.withArgs(firstModuleTemplateUrl).returns(Promise.resolve(firstModuleHtml));
        mockModule.getTemplate.withArgs(secondModuleTemplateUrl).returns(Promise.resolve(secondModuleHtml));
        requireStub.returns(mockModule);
        // assume pages el is already created on instantiation
        mockPage.el = document.createElement('div');
        return router.triggerRoute(pageUrl).then(function () {
            assert.equal(pagesContainer.children[0].innerHTML, secondModuleHtml + firstModuleHtml,  'second module html was appended first because it was specified first in routes config');
            router.stop();
        });
    });

    it('should only load global modules once, even when module is assigned to multiple pages in routes config', function () {
        // setup
        var pageUrl = 'my/page/url';
        var secondPageUrl = 'second/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleHtml = "<div>my module content</div>";
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        pagesConfig[secondPageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.withArgs(moduleTemplateUrl).returns(Promise.resolve(moduleHtml));
        requireStub.returns(mockModule);
        mockModule.appendEl = sinon.spy();
        return router.triggerRoute(pageUrl).then(function () {
            return router.triggerRoute(secondPageUrl).then(function () {
                assert.equal(mockModule.load.callCount, 1,  'load call was only triggered once even though module appears on multiple pages');
                router.stop();
            });
        });
    });

    it('should NOT call global module hide() method when navigating to page that does not have it', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleHtml = "<div>my module content</div>";
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.withArgs(moduleTemplateUrl).returns(Promise.resolve(moduleHtml));
        requireStub.withArgs(moduleScriptUrl).returns(mockModule);
        return router.triggerRoute(pageUrl).then(function () {
            assert.equal(mockModule.hide.callCount, 0,  'hide() was not called on initial route because it has not yet been shown');
            router.stop();
        });
    });

    it('all modules associated with a page should show() when requesting a url to a page that has the modules designated', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var firstModuleName = 'myFIRSTCustomModule';
        var firstModuleScriptUrl = 'path/to/first/script';
        var secondModuleName = 'myCustomModule2';
        var secondModuleScriptUrl = 'second/path/to/second/script';
        modulesConfig[firstModuleName] = {
            script: firstModuleScriptUrl
        };
        modulesConfig[secondModuleName] = {
            script: secondModuleScriptUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        pagesConfig[pageUrl] = {
            modules: [
                secondModuleName,
                firstModuleName
            ],
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        var firstMockModule = new Module();
        var firstModuleShowSpy = sinon.spy(firstMockModule, 'show');
        var secondMockModule = new Module();
        var secondModuleShowSpy = sinon.spy(secondMockModule, 'show');
        requireStub.withArgs(firstModuleScriptUrl).returns(firstMockModule);
        requireStub.withArgs(secondModuleScriptUrl).returns(secondMockModule);
        return router.triggerRoute(pageUrl).then(function () {
            assert.equal(firstModuleShowSpy.callCount, 1, 'first modules show() method was called');
            assert.equal(secondModuleShowSpy.callCount, 1, 'second modules show() method was called');
            router.stop();
        });
    });

    it('all modules associated with a page should hide() when navigation away from it', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var firstModuleName = 'myFIRSTCustomModule';
        var firstModuleScriptUrl = 'path/to/first/script';
        var secondModuleName = 'myCustomModule2';
        var secondModuleScriptUrl = 'second/path/to/second/script';
        modulesConfig[firstModuleName] = {
            script: firstModuleScriptUrl
        };
        modulesConfig[secondModuleName] = {
            script: secondModuleScriptUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        pagesConfig[pageUrl] = {
            modules: [
                secondModuleName,
                firstModuleName
            ],
            script: pageScriptUrl
        };
        var secondPageUrl = 'path/to/second/page';
        pagesConfig[secondPageUrl] = {
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        var firstMockModule = new Module();
        var firstModuleHideStub = sinon.stub(firstMockModule, 'hide').returns(Promise.resolve());
        var secondMockModule = new Module();
        var secondModuleHideStub = sinon.stub(secondMockModule, 'hide').returns(Promise.resolve());
        requireStub.withArgs(firstModuleScriptUrl).returns(firstMockModule);
        requireStub.withArgs(secondModuleScriptUrl).returns(secondMockModule);
        return router.triggerRoute(pageUrl).then(function () {
            // register first url into window state
            router.history = [{path: pageUrl}];
            return router.triggerRoute(secondPageUrl).then(function () {
                assert.equal(firstModuleHideStub.callCount, 1, 'first modules hide() method was called');
                assert.equal(secondModuleHideStub.callCount, 1, 'second modules hide() method was called');
                router.stop();
            });
        });
    });

    it('navigating back to a previously loaded page, after navigating away, cause page\'s show method again', function () {
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var pageScriptUrl = 'path/to/page/script';
        var secondPageScript = 'second/path/to/page/script';
        pagesConfig[pageUrl] = {
            script: pageScriptUrl
        };
        var secondPageUrl = 'path/to/second/page';
        pagesConfig[secondPageUrl] = {
            script: secondPageScript
        };
        var router = require('./../src/router');
        router.start({pagesConfig: pagesConfig});
        var secondPageInstance = new Page();
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        requireStub.withArgs(secondPageScript).returns(secondPageInstance);
        var firstPageShowCount = 0;
        return router.triggerRoute(pageUrl).then(function () {
            firstPageShowCount++;
            return router.triggerRoute(secondPageUrl).then(function () {
                return router.triggerRoute(pageUrl).then(function () {
                firstPageShowCount++;
                    assert.equal(mockPage.show.callCount, firstPageShowCount, 'first page show() method was called twice');
                    router.stop();
                });
            });
        });
    });

    it('should call show() on a page that is navigated back to, from a page that fails to load', function () {
        var secondPageUrl = 'my/second/url';
        var firstPageUrl = 'my/real/url';
        var firstPageRouteRegex = '^' + firstPageUrl;
        var secondPageRouteRegex = '^' + secondPageUrl;
        var firstPageScriptUrl = 'path/to/my/script.js';
        var secondPageScriptUrl = 'path/to/my/script2.js';
        var pagesConfig = {};
        pagesConfig[firstPageRouteRegex] = {script: firstPageScriptUrl};
        pagesConfig[secondPageRouteRegex] = {script: secondPageScriptUrl};
        var router = require('./../src/router');
        router.start({pagesConfig: pagesConfig});
        var loadPageSpy = sinon.spy(router, 'loadPage');
        var firstMockPage = createPageStub(Page);
        var secondMockPage = createPageStub(Page);
        requireStub.withArgs(firstPageScriptUrl).returns(firstMockPage);
        requireStub.withArgs(secondPageScriptUrl).returns(secondMockPage);
        // fail load on second page
        secondMockPage.load.returns(Promise.reject());
        var firstPageShowCallCount = 0;
        return router.triggerRoute(firstPageUrl).then(function () {
            firstPageShowCallCount++;
            return router.triggerRoute(secondPageUrl).catch(function () {
                return router.triggerRoute(firstPageUrl).then(function () {
                    firstPageShowCallCount++;
                    assert.equal(firstMockPage.show.callCount, firstPageShowCallCount, 'first page show() method was called again even after a previous page fails to load');
                    router.stop();
                    loadPageSpy.restore();
                });
            });
        });
    });

    it('should call load() on a page that is requested again after it previously failed to load', function () {
        var pageUrl = 'my/real/url';
        var pageRouteRegex = '^' + pageUrl;
        var pageScriptUrl = 'path/to/my/script.js';
        var pagesConfig = {};
        pagesConfig[pageRouteRegex] = {script: pageScriptUrl};
        var router = require('./../src/router');
        router.start({pagesConfig: pagesConfig});
        var loadPageSpy = sinon.spy(router, 'loadPage');
        var mockPage = createPageStub(Page);
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        // fail load call
        mockPage.load.returns(Promise.reject());
        var pageLoadCallCount = 0;
        return router.triggerRoute(pageUrl).catch(function () {
            pageLoadCallCount++;
                return router.triggerRoute(pageUrl).catch(function () {
                    pageLoadCallCount++;
                    assert.equal(mockPage.load.callCount, pageLoadCallCount);
                    router.stop();
                    loadPageSpy.restore();
                });
        });
    });

    it('should resolve the triggerRoute promise but still call a global module\'s error method when global module fails to load', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        // fail global module loading
        var errorObj = {my: 'error'};
        mockModule.load.returns(Promise.reject(errorObj));
        requireStub.returns(mockModule);
        return router.triggerRoute(pageUrl).then(function () {
            assert.deepEqual(mockModule.error.args[0][0], errorObj,  'modules error method was called with error object as first argument');
            router.stop();
        });
    });

    it('loadPage() should NOT reject when a global module fails to load', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleHtml = "<div>my module content</div>";
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.withArgs(moduleTemplateUrl).returns(Promise.resolve(moduleHtml));
        // fail global module loading
        var errorObj = {my: 'error'};
        mockModule.load.returns(Promise.reject(errorObj));
        requireStub.returns(mockModule);
        return router.loadPage(pageUrl).then(function () {
            router.stop();
        });
    });

    it('should allow a global module to finish fetching its data before its show method is called', function (done) {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        // build promise
        var moduleFetchDataPromiseObj = {};
        var moduleFetchDataPromise = new Promise(function (resolve, reject){
            moduleFetchDataPromiseObj.resolve = resolve;
            moduleFetchDataPromiseObj.reject = reject;
        });
        mockModule.fetchData.returns(moduleFetchDataPromise);
        requireStub.returns(mockModule);
        mockPage.show.returns(Promise.resolve());
        var triggerRoutePromise = router.triggerRoute(pageUrl);
        assert.equal(mockModule.show.callCount, 0,  'module show() is not yet called because its data hasnt finished fetching');
        moduleFetchDataPromiseObj.resolve();
        triggerRoutePromise.then(function () {
            assert.equal(mockModule.show.callCount, 1,  'module show() is called after its data is done fetching');
            router.stop();
            done();
        });
    });


    it('should NOT call a global module\'s load() method when page does not specify it', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            script: pageScriptUrl
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        requireStub.returns(mockModule);
        return router.triggerRoute(pageUrl).then(function () {
            assert.deepEqual(mockModule.load.callCount, 0);
            router.stop();
        });
    });

    it('should call show() for a global module on page that has already been visited, after having visited a page without it', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var noGlobalModulePageUrl = 'no/gm';
        pagesConfig[noGlobalModulePageUrl] = {
            template: pageTemplateUrl,
            script: pageScriptUrl
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        requireStub.withArgs(moduleScriptUrl).returns(mockModule);
        return router.triggerRoute(pageUrl).then(function () {
            assert.equal(mockModule.show.callCount, 1,  'global modules show() method was called');
            return router.triggerRoute(noGlobalModulePageUrl).then(function () {
                return router.triggerRoute(pageUrl).then(function () {
                    assert.equal(mockModule.show.callCount, 2,  'global modules show() method was called again');
                    router.stop();
                });
            });
        });
    });

    it('hidePage() should call hideGlobalModules() with same path', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var noGlobalModulePageUrl = 'no/gm';
        pagesConfig[noGlobalModulePageUrl] = {
            template: pageTemplateUrl,
            script: pageScriptUrl
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        // build promise
        requireStub.returns(mockModule);
        var hideGlobalModulesStub = sinon.stub(router, 'hidePage').returns(Promise.resolve());
        return router.loadPage(pageUrl).then(function () {
            return router.hidePage(pageUrl).then(function () {
                assert.equal(hideGlobalModulesStub.args[0][0], pageUrl, 'hideGlobalModules() was called with same page url passed to hidePage()');
                hideGlobalModulesStub.restore();
                router.stop();
            });
        });
    });

    it('hideGlobalModules() should call hide on all modules on a previous page', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var noGlobalModulePageUrl = 'no/gm';
        pagesConfig[noGlobalModulePageUrl] = {
            template: pageTemplateUrl,
            script: pageScriptUrl
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        requireStub.returns(mockModule);
        // load global modules first
        return router.loadGlobalModules(pageUrl).then(function () {
            return router.hideGlobalModules(pageUrl).then(function () {
                assert.equal(mockModule.hide.callCount, 1);
                router.stop();
            });
        });
    });

    it('loadPage() should call loadGlobalModules() with same path', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        requireStub.withArgs(moduleScriptUrl).returns(mockModule);
        var loadGlobalModulesStub = sinon.stub(router, 'loadGlobalModules').returns(Promise.resolve());
        assert.equal(loadGlobalModulesStub.callCount, 0, 'not yet called');
        return router.loadPage(pageUrl).then(function () {
            assert.equal(loadGlobalModulesStub.args[0][0], pageUrl);
            loadGlobalModulesStub.restore();
            router.stop();
        });
    });

    it('showPage() should call showGlobalModules() with same path', function () {
        // setup
        var pageUrl = 'my/page/url';
        var pagesConfig = {};
        var modulesConfig = {};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleTemplateUrl = 'url/to/my/template';
        modulesConfig[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var noGlobalModulePageUrl = 'no/gm';
        pagesConfig[noGlobalModulePageUrl] = {
            template: pageTemplateUrl,
            script: pageScriptUrl
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        // build promise
        requireStub.returns(mockModule);
        var showGlobalModulesStub = sinon.stub(router, 'showGlobalModules').returns(Promise.resolve());
        assert.equal(showGlobalModulesStub.callCount, 0, 'not yet called');
        router.showPage(pageUrl);
        assert.equal(showGlobalModulesStub.args[0][0], pageUrl);
        showGlobalModulesStub.restore();
        router.stop();
    });

    it('getPageConfigByPath() should return the config of the first matching page if more than one regex match exists', function () {
        // setup
        var pageUrl = 'my/page/url';
        var firstPageUrlRegex = pageUrl + '';
        var secondPageUrlRegex = pageUrl + '/?'; // optional slash
        var pagesConfig = {};
        var modulesConfig = {};
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        pagesConfig[firstPageUrlRegex] = {
            template: pageTemplateUrl,
            script: pageScriptUrl,
            test: '1'
        };
        // add second matching page config
        pagesConfig[secondPageUrlRegex] = {
            template: pageTemplateUrl,
            script: pageScriptUrl,
            test: '2'
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        assert.deepEqual(router.getPageConfigByPath(pageUrl), pagesConfig[firstPageUrlRegex]);
        router.stop();
    });

    it('loadPage() should load the first matching page if more than one page matches the url passed to triggerRoute()', function () {
        // setup
        var pageUrl = 'my/page/url';
        var firstPageUrlRegex = pageUrl + '';
        var secondPageUrlRegex = pageUrl + '/?'; // optional slash
        var pagesConfig = {};
        var modulesConfig = {};
        var pageScriptUrl = 'path/to/page/script';
        var secondPageScriptUrl = 'path/to/page/script2';
        pagesConfig[firstPageUrlRegex] = {
            script: pageScriptUrl
        };
        // add second matching page config
        pagesConfig[secondPageUrlRegex] = {
            script: secondPageScriptUrl
        };
        var router = require('./../src/router');
        router.start({
            pagesConfig: pagesConfig,
            modulesConfig: modulesConfig
        });
        var firstMockPage = createPageStub(Page);
        requireStub.withArgs(pageScriptUrl).returns(firstMockPage);
        var secondMockPage = createPageStub(Page);
        requireStub.withArgs(secondPageScriptUrl).returns(secondMockPage);
        return router.triggerRoute(pageUrl).then(function () {
            assert.deepEqual(firstMockPage.load.callCount, 1, 'first matching page was loaded');
            assert.deepEqual(secondMockPage.load.callCount, 0, 'second matching page was NOT loaded');
            router.stop();
        });
    });

    it('should pass the data property that has replaced reference group of the matching route config of the url requested to the associated page\'s fetchData() method ', function (done) {
        // setup
        var pageUrlRegex = '^profile/([0-9]+)$';
        var pagesConfig = {};
        var dataBaseUrl = 'http://localhost:8888/profile';
        var dataUrl = dataBaseUrl + '/$1';
        pagesConfig[pageUrlRegex] = {data: dataUrl};
        var router = require('./../src/router');
        var loadScriptStub = sinon.stub(router, 'loadScript');
        loadScriptStub.returns(Promise.resolve(mockPage));
        router.start({pagesConfig: pagesConfig});
        var profileNum = '32';
        router.triggerRoute('profile/' + profileNum).then(function () {
            assert.equal(mockPage.fetchData.args[0][0], dataBaseUrl + '/' + profileNum);
            router.stop();
            loadScriptStub.restore();
            done();
        });
    });

    it('should pass the data property that has replaced reference group of the matching route config of the slash-prefixed url requested to the associated page\'s fetchData() method', function (done) {
        // setup
        var pageUrlRegex = '^profile/([0-9]+)$';
        var pagesConfig = {};
        var dataBaseUrl = 'http://localhost:8888/profile';
        var dataUrl = dataBaseUrl + '/$1';
        pagesConfig[pageUrlRegex] = {data: dataUrl};
        var router = require('./../src/router');
        var loadScriptStub = sinon.stub(router, 'loadScript');
        loadScriptStub.returns(Promise.resolve(mockPage));
        router.start({pagesConfig: pagesConfig});
        var profileNum = '32';
        router.triggerRoute('/profile/' + profileNum).then(function () {
            assert.equal(mockPage.fetchData.args[0][0], dataBaseUrl + '/' + profileNum);
            router.stop();
            loadScriptStub.restore();
            done();
        });
    });

});
