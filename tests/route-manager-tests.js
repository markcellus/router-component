var sinon = require('sinon');
var ResourceManager = require('resource-manager-js');
var assert = require('assert');
var Promise = require('promise');
var Page = require('../src/page');
var Module = require('module.js');
var _ = require('underscore');

describe('Route Manager', function () {
    'use strict';
    var mockPage, mockModule, resourceManagerLoadTemplateStub, windowAddEventListenerStub, origPushState, requireStub, origRegisterUrlHistory;

    beforeEach(function () {
        // don't change url of test page!
        origPushState = window.history.pushState;
        window.history.pushState = sinon.stub();

        // set up mock page and set defaults
        mockPage = sinon.createStubInstance(Page);
        mockPage.getTemplate.returns(Promise.resolve());
        mockPage.load.returns(Promise.resolve());
        mockPage.show.returns(Promise.resolve());
        mockPage.getStyles.returns(Promise.resolve());
        mockPage.getData.returns(Promise.resolve());
        // setup module and set defaults
        mockModule = sinon.createStubInstance(Module);
        mockModule.getTemplate.returns(Promise.resolve());
        mockModule.load.returns(Promise.resolve());
        mockModule.show.returns(Promise.resolve());
        mockModule.getStyles.returns(Promise.resolve());
        mockModule.getData.returns(Promise.resolve());

        requireStub = sinon.stub(window, 'require');

        resourceManagerLoadTemplateStub = sinon.stub(ResourceManager, 'loadTemplate');
        resourceManagerLoadTemplateStub.returns(Promise.resolve());
        // dont trigger any popstate events!
        windowAddEventListenerStub = sinon.stub(window, 'addEventListener');

    });

    afterEach(function () {
        window.history.pushState = origPushState;
        resourceManagerLoadTemplateStub.restore();
        windowAddEventListenerStub.restore();
        requireStub.restore();
    });

    it('should fire a url change event when a url is triggered', function () {
        var RouteManager = require('route-manager')({config: {}});
        var url = 'my/testable/url';
        var urlChangeSpy = sinon.spy();
        RouteManager.start();
        RouteManager.addEventListener('url:change', urlChangeSpy);
        RouteManager.triggerRoute(url);
        assert.equal(urlChangeSpy.callCount, 1, 'url change spy was called when url is triggered');
        RouteManager.removeEventListener('url:change', urlChangeSpy);
        RouteManager.stop();
    });

    it('should reject the promise when trying to trigger a url that has not been specified in the route config', function () {
        var RouteManager = require('route-manager')({config: {}});
        var url = 'my/testable/url';
        RouteManager.start();
        return RouteManager.triggerRoute(url)
            .catch(function (obj) {
                RouteManager.stop();
                assert.equal(obj.message, 'Router Error: No routes configuration for ' + url, 'triggerRoute returns with an error message because no url match in route config');
            });
    });

    it('should call pushState with correct path when triggering url', function () {
        var RouteManager = require('route-manager')({config: {}});
        var url = 'my/testable/url';
        var loadPageStub = sinon.stub(RouteManager, 'loadPage').returns(Promise.resolve(mockPage));
        RouteManager.start();
        return RouteManager.triggerRoute(url)
            .then(function () {
                assert.equal(window.history.pushState.args[0][0].path, url, 'history.pushState() was called with correct data history');
                assert.equal(window.history.pushState.args[0][2], url, 'history.pushState() was called with correct url parameter');
                loadPageStub.restore();
                RouteManager.stop();
            });
    });

    it('should use a fallback page instance when there is no script specified for a page in the route config', function (done) {
        // setup
        var pageUrl = 'my/index/with/no/script/url';
        var dataUrl = 'get/my/data';
        var routesConfig = {pages: {}};
        routesConfig.pages[pageUrl] = {
            data: dataUrl
        };
        var mockData = {};
        resourceManagerLoadTemplateStub.returns(Promise.resolve());
        mockPage.getTemplate.returns();
        mockPage.getData.returns(Promise.resolve(mockData));
        var pagesContainer = document.createElement('div');
        pagesContainer.classList.add('page-container');
        document.body.appendChild(pagesContainer);
        var RouteManager = require('route-manager')({
            config: routesConfig,
            pagesContainerEl: pagesContainer
        });
        var pageInitializeSpy = sinon.spy(Page.prototype, 'initialize');
        var pageGetDataStub = sinon.stub(Page.prototype, 'getData').returns(Promise.resolve({}));
        RouteManager.start();
        RouteManager.triggerRoute(pageUrl)
            .then(function () {
                assert.equal(pageInitializeSpy.callCount, 1, 'fallback page instance was initialized');
                assert.deepEqual(requireStub.callCount, 0, 'no script require() call was made');
                document.body.removeChild(pagesContainer);
                pageInitializeSpy.restore();
                pageGetDataStub.restore();
                RouteManager.stop();
                done();
            })
            .catch(done);
    });

    it('should call page\'s getTemplate method with template url specified in routes configuration', function () {
        // setup
        var pageUrl = 'url/to/page/with/template';
        var templateUrl = 'path/to/my/tmpl.html';
        var routesConfig = {pages: {}};
        routesConfig.pages[pageUrl] = {
            template: templateUrl
        };
        var mockTemplate = '<div></div>';
        var RouteManager = require('route-manager')({config: routesConfig});
        var loadPageScript = sinon.stub(RouteManager, 'loadPageScript').returns(Promise.resolve(mockPage));
        mockPage.getTemplate.withArgs(templateUrl).returns(Promise.resolve(mockTemplate));
        mockPage.load.returns(Promise.resolve());
        mockPage.show.returns(Promise.resolve());
        mockPage.getData.returns(Promise.resolve());
        RouteManager.start();
        return RouteManager.triggerRoute(pageUrl)
            .then(function () {
                assert.deepEqual(mockPage.getTemplate.args[0], [templateUrl], 'template url was passed to resource manager\'s loadTemplate() method');
                loadPageScript.restore();
                RouteManager.stop();
            });
    });

    it('should pass the data property of the matching route config of the url requested to the associated page\'s getData() method', function (done) {
        // setup
        var pageUrl = 'my/real/url';
        var dataUrl = 'get/my/data';
        var routesConfig = {pages: {}};
        routesConfig.pages[pageUrl] = {
            data: dataUrl
        };
        var mockData = {};
        mockPage.getTemplate.returns(Promise.resolve());
        mockPage.getData.returns(Promise.resolve(mockData));
        mockPage.load.returns(Promise.resolve());
        mockPage.show.returns(Promise.resolve());
        var RouteManager = require('route-manager')({config: routesConfig});
        var loadPageScriptStub = sinon.stub(RouteManager, 'loadPageScript').returns(Promise.resolve(mockPage));
        RouteManager.start();
        RouteManager.triggerRoute(pageUrl)
            .then(function () {
                assert.deepEqual(mockPage.getData.args[0], [dataUrl], 'page instance\'s getData() method was passed requested url');
                loadPageScriptStub.restore();
                RouteManager.stop();
                done();
            })
            .catch(done);
    });

    it('should console an error and reject promise if a module doesnt have a script file', function (done) {
        // setup
        var pageUrl = 'my/real/url';
        var dataUrl = 'get/my/data';
        var routesConfig = {pages: {}, modules: {}};
        var moduleName = 'myCustomModule';
        routesConfig.modules[moduleName] = {};
        routesConfig.pages[pageUrl] = {
            data: dataUrl,
            modules: [moduleName]
        };
        var consoleErrorStub = sinon.stub(console, 'error');
        var RouteManager = require('route-manager')({config: routesConfig});
        mockPage.getTemplate.returns(Promise.resolve());
        mockPage.load.returns(Promise.resolve());
        mockPage.show.returns(Promise.resolve());
        mockPage.getData.returns(Promise.resolve());
        resourceManagerLoadTemplateStub.returns(Promise.resolve());
        var loadPageScriptStub = sinon.stub(RouteManager, 'loadPageScript').returns(Promise.resolve(mockPage));
        RouteManager.start();
        RouteManager.triggerRoute(pageUrl)
            .then(done)
            .catch(function () {
                assert.ok(error, 'promise was rejected');
                assert.equal(consoleErrorStub.callCount, 1, 'console error was printed');
                loadPageScriptStub.restore();
                consoleErrorStub.restore();
                RouteManager.stop();
                done();
            });
    });

    it('should fire a page load event when a url is triggered', function () {
        // setup
        var pageUrl = 'my/page/load/event/url';
        var routesConfig = {pages: {}};
        routesConfig.pages[pageUrl] = {};
        var RouteManager = require('route-manager')({config: routesConfig});
        var pageLoadSpy = sinon.spy();
        mockPage.getTemplate.returns(Promise.resolve());
        mockPage.getData.returns(Promise.resolve());
        mockPage.load.returns(Promise.resolve());
        mockPage.show.returns(Promise.resolve());
        var loadPageScript = sinon.stub(RouteManager, 'loadPageScript').returns(Promise.resolve(mockPage));
        RouteManager.start();
        RouteManager.addEventListener('page:load', pageLoadSpy);
        return RouteManager.triggerRoute(pageUrl).then(function () {
            assert.equal(pageLoadSpy.callCount, 1, 'url change spy was called when url is triggered');
            RouteManager.removeEventListener('page:load', pageLoadSpy);
            RouteManager.stop();
            loadPageScript.restore();
        });
    });

    it('should call the load method of the page entry in the route config that has a regex', function () {
        // setup
        var pageUrl = 'test/url';
        var routesConfig = {pages: {}};
        var pageConfig = {my: 'stuff'};
        routesConfig.pages[pageUrl + '(/)?$'] = pageConfig;
        var RouteManager = require('route-manager')({config: routesConfig});
        var loadPageScript = sinon.stub(RouteManager, 'loadPageScript');
        mockPage.getTemplate.returns(Promise.resolve());
        mockPage.load.returns(Promise.resolve());
        mockPage.show.returns(Promise.resolve());
        mockPage.getData.returns(Promise.resolve());
        loadPageScript.returns(Promise.resolve(mockPage));
        RouteManager.start();
        RouteManager.triggerRoute(pageUrl).then(function () {
            assert.equal(mockPage.load.callCount, 1, 'module load was called');
            RouteManager.stop();
            loadPageScript.restore();
        });
    });

    it('should pass any options object specified for a module in routes config to the module\'s instantiation', function () {
        // setup
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var moduleName = 'myCustomModule';
        var moduleOptions = {my: 'moduleOptions'};
        var moduleScriptUrl = 'path/to/module/script';
        var pageScriptUrl = 'path/to/page/script';
        routesConfig.modules[moduleName] = {
            script: moduleScriptUrl,
            options: moduleOptions
        };
        routesConfig.pages[pageUrl] = {
            script: pageScriptUrl,
            modules: [moduleName]
        };
        var RouteManager = require('route-manager')({config: routesConfig});
        var pageClass = sinon.stub().returns(mockPage);
        requireStub.withArgs(pageScriptUrl).returns(pageClass);

        var moduleInitializeStub = sinon.stub().returns(mockModule);
        requireStub.withArgs(moduleScriptUrl).returns(moduleInitializeStub);
        RouteManager.start();
        RouteManager.triggerRoute(pageUrl).then(function () {
            assert.deepEqual(moduleInitializeStub.args[0][0], moduleOptions,  'module was instantiated with custom options');
            RouteManager.stop();
        });
    });

    it('should pass page level data to submodules load() call', function () {
        // setup
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var moduleName = 'myCustomModule';
        var moduleOptions = {my: 'moduleOptions'};
        var moduleScriptUrl = 'path/to/module/script';
        var pageData = {page: 'customPageData here'};
        var moduleHtml = '<div>{{page}}</div>';
        var moduleTemplateUrl = 'url/to/my/template';
        routesConfig.modules[moduleName] = {
            script: moduleScriptUrl,
            options: moduleOptions,
            template: moduleTemplateUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        routesConfig.pages[pageUrl] = {
            script: pageScriptUrl,
            modules: [moduleName],
            template: pageTemplateUrl
        };
        resourceManagerLoadTemplateStub.withArgs(moduleTemplateUrl).returns(Promise.resolve(moduleHtml));
        var mockPage = new Page({el: document.createElement('div')});
        var pageShowStub = sinon.stub(mockPage, 'show').returns(Promise.resolve());
        var pageLoadStub = sinon.stub(mockPage, 'load').returns(Promise.resolve());
        var pageGetDataStub = sinon.stub(mockPage, 'getData').returns(Promise.resolve(pageData));
        var RouteManager = require('route-manager')({config: routesConfig});
        var pageClass = sinon.stub().returns(mockPage);
        requireStub.withArgs(pageScriptUrl).returns(pageClass);
        var CustomModule = Module.extend({
            load: sinon.stub().returns(Promise.resolve()),
            getTemplate: sinon.stub().returns(Promise.resolve(moduleHtml))
        });
        requireStub.withArgs(moduleScriptUrl).returns(CustomModule);
        RouteManager.start();
        RouteManager.triggerRoute(pageUrl).then(function () {
            assert.deepEqual(CustomModule.prototype.load.args[0][0].data, pageData,  'sub module\'s load() was called with page level data');
            pageLoadStub.restore();
            pageShowStub.restore();
            pageGetDataStub.restore();
            RouteManager.stop();
        });
    });

    it('should fire a page error event when there is no config setup for a requested url', function () {
        // setup
        var pageUrl = 'my/page/load/event/url';
        var routesConfig = {pages: {}};
        var RouteManager = require('route-manager')({config: routesConfig});
        var pageErrorSpy = sinon.spy();
        mockPage.getTemplate.returns(Promise.resolve());
        mockPage.getData.returns(Promise.resolve());
        mockPage.load.returns(Promise.resolve());
        mockPage.show.returns(Promise.resolve());
        var loadPageScript = sinon.stub(RouteManager, 'loadPageScript').returns(Promise.resolve(mockPage));
        RouteManager.start();
        RouteManager.addEventListener('page:error', pageErrorSpy);
        return RouteManager.triggerRoute(pageUrl).catch(function (obj) {
            assert.equal(pageErrorSpy.args[0][0].type, 'page:error', 'correct error was thrown');
            assert.equal(obj.message, 'Router Error: No routes configuration for ' + pageUrl, 'correct error was thrown');
            RouteManager.removeEventListener('page:error', pageErrorSpy);
            RouteManager.stop();
            loadPageScript.restore();
        });
    });

    it('getting current url params when NO route has been triggered', function () {
        var routesConfig = {pages: {}};
        var RouteManager = require('route-manager')({config: routesConfig});
        var origHash = window.location.hash;
        window.location.hash = '#test';
        RouteManager.start();
        assert.deepEqual(RouteManager.getRelativeUrlParams(), ['test'], 'calling getRelativeUrlParams() before triggering a route returns correct url');
        window.location.hash = origHash;
        RouteManager.stop();
    });

    it('getting current url params when a route has been triggered', function () {
        var routesConfig = {pages: {}};
        var RouteManager = require('route-manager')({config: routesConfig});
        var origHash = window.location.hash;
        RouteManager.start();
        var url = 'my/url';
        RouteManager.triggerRoute(url);
        assert.deepEqual(RouteManager.getRelativeUrlParams(), ['my', 'url'], 'getRelativeUrlParams() returns correct url params of the url that was triggered');
        window.location.hash = origHash;
        RouteManager.stop();
    });

    it('getting current url when a route has been triggered', function () {
        var routesConfig = {pages: {}};
        var RouteManager = require('route-manager')({config: routesConfig});
        var origHash = window.location.hash;
        RouteManager.start();
        var url = 'my/url';
        RouteManager.triggerRoute(url);
        assert.deepEqual(RouteManager.getRelativeUrl(), url, 'getRelativeUrl() returns correct url that was triggered');
        window.location.hash = origHash;
        RouteManager.stop();
    });

    it('getting the current url that contains a leading slash', function () {
        var routesConfig = {pages: {}};
        var RouteManager = require('route-manager')({config: routesConfig});
        var origHash = window.location.hash;
        RouteManager.start();
        var url = '/leading/slash/url';
        RouteManager.triggerRoute(url);
        assert.deepEqual(RouteManager.getRelativeUrl(), 'leading/slash/url', 'getRelativeUrl() returns the url without the slash');
        window.location.hash = origHash;
        RouteManager.stop();
    });

    it('should call loadPage() with new url when pop state changes', function (done) {
        var routesConfig = {pages: {}};
        var popStateListener = windowAddEventListenerStub.withArgs('popstate');
        var RouteManager = require('route-manager')({config: routesConfig});
        var loadPageStub = sinon.stub(RouteManager, 'loadPage').returns(Promise.resolve(mockPage));
        RouteManager.start();
        var url = 'my/url';
        var event = {state: {path: url}};
        popStateListener.callArgWith(1, event); // trigger pop state event!
        // must wait until promise for custom route handling resolves
        _.delay(function () {
            assert.equal(loadPageStub.args[0][0], url, 'loadPage() was called with new pop state url');
            loadPageStub.restore();
            RouteManager.stop();
            done();
        }, 10);
    });

    it('should pass the styles property of the matching route config of the url requested to the associated page\'s getStyles() method', function () {
        // setup
        var pageUrl = 'my/real/url';
        var pageScriptUrl = 'path/to/page/script';
        var stylesUrls = ['get/my/data'];
        var routesConfig = {pages: {}};
        routesConfig.pages[pageUrl] = {script: pageScriptUrl, styles: stylesUrls};
        var RouteManager = require('route-manager')({config: routesConfig});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        RouteManager.start();
        return RouteManager.triggerRoute(pageUrl)
            .then(function () {
                assert.deepEqual(mockPage.getStyles.args[0], [stylesUrls], 'page instance\'s getStyles() method was passed with correct style paths');
                RouteManager.stop();
            });
    });

    it('should call loadPage() with new url when overriding route request', function () {
        var routesConfig = {pages: {}};
        var RouteManager = require('route-manager')({config: routesConfig});
        var loadPageStub = sinon.stub(RouteManager, 'loadPage').returns(Promise.resolve(mockPage));
        RouteManager.start();
        var url = 'my/url';
        return RouteManager.triggerRoute(url).then(function () {
            assert.equal(loadPageStub.args[0][0], url, 'loadPage() was called with new pop state url');
            loadPageStub.restore();
            RouteManager.stop();
        });
    });

    it('should load an intercepted url path via onRouteRequest callback instead of the original requested url', function () {
        var secondTestUrl = 'my/second/url';
        var firstPageUrl = '^my/real/url';
        var secondPageUrl = '^' + secondTestUrl;
        var firstPageScriptUrl = 'path/to/my/script.js';
        var secondPageScriptUrl = 'path/to/my/script2.js';
        var routesConfig = {pages: {}};
        routesConfig.pages[firstPageUrl] = {script: firstPageScriptUrl};
        routesConfig.pages[secondPageUrl] = {script: secondPageScriptUrl};
        var onRouteRequestStub = sinon.stub();
        var RouteManager = require('route-manager')({
            config: routesConfig,
            onRouteRequest: onRouteRequestStub
        });
        var loadPageStub = sinon.stub(RouteManager, 'loadPage').returns(Promise.resolve(mockPage));
        // hijack url history registrar for internal test implementation
        RouteManager.registerUrlHistory = function (path) {
            //ensure history reflects first path state
            RouteManager.history.push({path: path});
        };
        RouteManager.start();
        // redirect to new route
        onRouteRequestStub.returns(Promise.resolve(secondTestUrl));
        return RouteManager.triggerRoute(firstPageUrl).then(function () {
            assert.equal(loadPageStub.args[0][0], secondTestUrl, 'loadPage() was called with second url');
            assert.equal(loadPageStub.callCount, 1, 'loadPage() was only called once');
            loadPageStub.restore();
            RouteManager.stop();
        });
    });

    it('should call hide() on an overriding page when the original url that was called is triggered after it', function () {
        var secondTestUrl = 'my/second/url';
        var firstPageUrl = '^my/real/url';
        var secondPageUrl = '^' + secondTestUrl;
        var firstPageScriptUrl = 'path/to/my/script.js';
        var secondPageScriptUrl = 'path/to/my/script2.js';
        var routesConfig = {pages: {}};
        routesConfig.pages[firstPageUrl] = {script: firstPageScriptUrl};
        routesConfig.pages[secondPageUrl] = {script: secondPageScriptUrl};
        var firstMockPage = new Page();
        var secondMockPage = new Page();
        var onRouteRequestStub = sinon.stub();
        var RouteManager = require('route-manager')({
            config: routesConfig,
            onRouteRequest: onRouteRequestStub
        });
        resourceManagerLoadTemplateStub.returns(Promise.resolve());
        requireStub.withArgs(firstPageScriptUrl).returns(firstMockPage);
        requireStub.withArgs(secondPageScriptUrl).returns(secondMockPage);
        RouteManager.start();
        var pushStateCallCount = 0;
        // redirect to new route
        onRouteRequestStub.returns(Promise.resolve(secondTestUrl));
        return RouteManager.triggerRoute(firstPageUrl).then(function () {
            pushStateCallCount++; // account for first url
            pushStateCallCount++; // account for second url
            assert.equal(window.history.pushState.args[pushStateCallCount - 1][2], secondTestUrl, 'pushState was called with new url');
            firstMockPage.destroy();
            secondMockPage.destroy();
            RouteManager.stop();
        });
    });

    //it('should call previous pages hide method immediately when a new page is requested', function () {
    //    var firstPageUrl = 'my/page/url';
    //    var secondPageUrl = 'two/second/page';
    //    var routesConfig = {pages: {}};
    //    var firstPageScriptUrl = 'path/to/page/script';
    //    var secondPageScriptUrl = 'second/path/to/page/script';
    //    var pageTemplateUrl = 'url/to/my/template';
    //    routesConfig.pages[firstPageUrl] = {
    //        template: pageTemplateUrl,
    //        script: firstPageScriptUrl
    //    };
    //    routesConfig.pages[secondPageUrl] = {
    //        template: pageTemplateUrl,
    //        script: secondPageScriptUrl
    //    };
    //    var RouteManager = require('route-manager')({config: routesConfig});
    //    var secondMockPage = new Page();
    //    requireStub.withArgs(firstPageScriptUrl).returns(mockPage);
    //    requireStub.withArgs(secondPageScriptUrl).returns(secondMockPage);
    //    // hijack url history registrar for internal test implementation
    //    RouteManager.registerUrlHistory = function (path) {
    //        //ensure history reflects first path state
    //        RouteManager.history.push({path: path});
    //    };
    //    RouteManager.start();
    //    var firstRequestPromise = RouteManager.triggerRoute(firstPageUrl);
    //    // request second url immediately
    //    RouteManager.triggerRoute(secondPageUrl);
    //    return firstRequestPromise.then(function () {
    //        assert.equal(mockPage.hide.callCount, 1, 'when first page finishes loading, its hide method was called because another page has already been requested');
    //        RouteManager.stop();
    //    });
    //});

    it('should attach page HTML to page\'s el', function () {
        // setup
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        routesConfig.pages[pageUrl] = {
            template: pageTemplateUrl,
            script: pageScriptUrl
        };
        var pageHtml = '<div>mypagehtml</div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var RouteManager = require('route-manager')({config: routesConfig});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        RouteManager.start();
        // assume pages el is already created on instantiation
        mockPage.el = document.createElement('div');
        return RouteManager.triggerRoute(pageUrl).then(function () {
            assert.equal(mockPage.el.innerHTML, pageHtml,  'page html was attached to page\'s el');
            RouteManager.stop();
        });
    });

    it('should attach module html to appropriate page\'s el', function () {
        // setup
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var moduleName = 'myCustomModule';
        var moduleOptions = {my: 'moduleOptions'};
        var moduleScriptUrl = 'path/to/module/script';
        var moduleHtml = "<div>my module content</div>";
        var moduleTemplateUrl = 'url/to/my/template';
        routesConfig.modules[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        routesConfig.pages[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var RouteManager = require('route-manager')({config: routesConfig});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.returns(Promise.resolve(moduleHtml));
        requireStub.withArgs(moduleScriptUrl).returns(mockModule);
        RouteManager.start();
        // assume pages el is already created on instantiation
        mockPage.el = document.createElement('div');
        return RouteManager.triggerRoute(pageUrl).then(function () {
            assert.equal(mockPage.el.children[0].innerHTML, moduleHtml,  'page html was attached to page\'s el');
            RouteManager.stop();
        });
    });

    it('should append the requested page\'s element to the pages container element', function () {
        // setup
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var moduleName = 'myCustomModule';
        var moduleOptions = {my: 'moduleOptions'};
        var moduleScriptUrl = 'path/to/module/script';
        var moduleHtml = "<div>my module content</div>";
        var moduleTemplateUrl = 'url/to/my/template';
        routesConfig.modules[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        routesConfig.pages[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var pageHtml = '<div>mypagehtml</div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var pagesContainer = document.createElement('div');
        var RouteManager = require('route-manager')({config: routesConfig, pagesContainerEl: pagesContainer});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.returns(Promise.resolve(moduleHtml));
        requireStub.withArgs(moduleScriptUrl).returns(mockModule);
        RouteManager.start();
        // assume pages el is already created on instantiation
        mockPage.el = document.createElement('div');
        return RouteManager.triggerRoute(pageUrl).then(function () {
            assert.ok(pagesContainer.contains(mockPage.el), pageHtml,  'page element was appended to pages container');
            RouteManager.stop();
        });
    });

    it('should attach multiple modules in the same order in which they are specified in routes config', function () {
        // setup
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var firstModuleName = 'myFIRSTCustomModule';
        var firstModuleScriptUrl = 'path/to/module/script';
        var firstModuleHtml = "<div>my module content</div>";
        var firstModuleTemplateUrl = 'url/to/my/template';
        var secondModuleName = 'myCustomModule2';
        var secondModuleScriptUrl = 'path/to/module/script';
        var secondModuleHtml = "<div>my second module content</div>";
        var secondModuleTemplateUrl = 'secon/url/to/my/template';
        routesConfig.modules[firstModuleName] = {
            template: firstModuleTemplateUrl,
            script: firstModuleScriptUrl
        };
        routesConfig.modules[secondModuleName] = {
            template: secondModuleTemplateUrl,
            script: secondModuleScriptUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        routesConfig.pages[pageUrl] = {
            template: pageTemplateUrl,
            modules: [
                secondModuleName,
                firstModuleName
            ],
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var RouteManager = require('route-manager')({config: routesConfig});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.withArgs(firstModuleTemplateUrl).returns(Promise.resolve(firstModuleHtml));
        mockModule.getTemplate.withArgs(secondModuleTemplateUrl).returns(Promise.resolve(secondModuleHtml));
        requireStub.returns(mockModule);
        RouteManager.start();
        // assume pages el is already created on instantiation
        mockPage.el = document.createElement('div');
        return RouteManager.triggerRoute(pageUrl).then(function () {
            assert.equal(mockPage.el.children[0].innerHTML, secondModuleHtml + firstModuleHtml,  'second module html was appended first because it was specified first in routes config');
            RouteManager.stop();
        });
    });

    //it('should only load modules that are global once, even when module is assigned to multiple pages in routes config', function () {
    //    // setup
    //    var pageUrl = 'my/page/url';
    //    var secondPageUrl = 'second/page/url';
    //    var routesConfig = {pages: {}, modules: {}};
    //    var moduleName = 'customModule';
    //    var moduleScriptUrl = 'path/to/module/script';
    //    var moduleHtml = "<div>my module content</div>";
    //    var moduleTemplateUrl = 'url/to/my/template';
    //    routesConfig.modules[moduleName] = {
    //        template: moduleTemplateUrl,
    //        script: moduleScriptUrl,
    //        global: true
    //    };
    //    var pageScriptUrl = 'path/to/page/script';
    //    var pageTemplateUrl = 'url/to/my/template';
    //    routesConfig.pages[pageUrl] = {
    //        template: pageTemplateUrl,
    //        modules: [moduleName],
    //        script: pageScriptUrl
    //    };
    //    routesConfig.pages[secondPageUrl] = {
    //        template: pageTemplateUrl,
    //        modules: [moduleName],
    //        script: pageScriptUrl
    //    };
    //    var pageHtml = '<div></div>';
    //    mockPage.getTemplate.returns(Promise.resolve(pageHtml));
    //    var pagesContainer = document.createElement('div');
    //    var RouteManager = require('route-manager')({config: routesConfig, pagesContainerEl: pagesContainer});
    //    requireStub.withArgs(pageScriptUrl).returns(mockPage);
    //    mockModule.getTemplate.withArgs(moduleTemplateUrl).returns(Promise.resolve(moduleHtml));
    //    requireStub.returns(mockModule);
    //    RouteManager.start();
    //    return RouteManager.triggerRoute(pageUrl).then(function () {
    //        return RouteManager.triggerRoute(secondPageUrl).then(function () {
    //            assert.equal(mockPage.load.callCount, 1,  'load call was only triggered once even though module appears on both pages');
    //            RouteManager.stop();
    //        });
    //    });
    //});

    //it('should load a modules template on multiple pages, even if module is a singleton', function () {
    //    // setup
    //    var pageUrl = 'my/page/url';
    //    var secondPageUrl = 'second/page/url';
    //    var routesConfig = {pages: {}, modules: {}};
    //    var moduleName = 'customModule';
    //    var moduleScriptUrl = 'path/to/module/script';
    //    var moduleHtml = "<div>my module content</div>";
    //    var moduleTemplateUrl = 'url/to/my/template';
    //    routesConfig.modules[moduleName] = {
    //        template: moduleTemplateUrl,
    //        script: moduleScriptUrl
    //    };
    //    var pageScriptUrl = 'path/to/page/script';
    //    var pageTemplateUrl = 'url/to/my/template';
    //    routesConfig.pages[pageUrl] = {
    //        template: pageTemplateUrl,
    //        modules: [moduleName],
    //        script: pageScriptUrl
    //    };
    //    routesConfig.pages[secondPageUrl] = {
    //        template: pageTemplateUrl,
    //        modules: [moduleName],
    //        script: pageScriptUrl
    //    };
    //    var pageHtml = '<div></div>';
    //    mockPage.getTemplate.returns(Promise.resolve(pageHtml));
    //    var pagesContainer = document.createElement('div');
    //    var RouteManager = require('route-manager')({config: routesConfig, pagesContainerEl: pagesContainer});
    //    requireStub.withArgs(pageScriptUrl).returns(mockPage);
    //    mockModule.getTemplate.withArgs(moduleTemplateUrl).returns(Promise.resolve(moduleHtml));
    //    requireStub.returns(mockModule);
    //    RouteManager.start();
    //    // assume pages el is already created on instantiation
    //    mockPage.el = document.createElement('div');
    //    return RouteManager.triggerRoute(pageUrl).then(function () {
    //        return RouteManager.triggerRoute(secondPageUrl).then(function () {
    //            var firstPageEl = pagesContainer.children[0];
    //            var secondPageEl = pagesContainer.children[1];
    //            assert.equal(firstPageEl.innerHTML, moduleHtml,  'first module html was appended first because it was specified first in routes config');
    //            assert.equal(secondPageEl.innerHTML, moduleHtml,  'second module html was appended first because it was specified first in routes config');
    //            RouteManager.stop();
    //        });
    //    });
    //});

});
