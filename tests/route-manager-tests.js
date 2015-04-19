var sinon = require('sinon');
var ResourceManager = require('resource-manager-js');
var assert = require('assert');
var Promise = require('promise');
var Page = require('../src/page');
var Module = require('module.js');
var _ = require('underscore');
var RouteManager = require('route-manager');

describe('Route Manager', function () {
    'use strict';
    var mockPage, mockModule,
        resourceManagerLoadTemplateStub,
        origPushState,
        requireStub;


    var createPageStub = function (cls) {
        var page = sinon.createStubInstance(cls);
        page.getTemplate.returns(Promise.resolve());
        page.load.returns(Promise.resolve());
        page.hide.returns(Promise.resolve());
        page.show.returns(Promise.resolve());
        page.getStyles.returns(Promise.resolve());
        page.fetchData.returns(Promise.resolve());
        return page;
    };

    beforeEach(function () {
        // don't change url of test page!
        origPushState = window.history.pushState;
        window.history.pushState = function () {};

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

        resourceManagerLoadTemplateStub = sinon.stub(ResourceManager, 'loadTemplate');
        resourceManagerLoadTemplateStub.returns(Promise.resolve());
        // dont trigger any popstate events!
        sinon.stub(window, 'addEventListener');

    });

    afterEach(function () {
        window.history.pushState = origPushState;
        resourceManagerLoadTemplateStub.restore();
        window.addEventListener.restore();
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
        var origPushState = window.history.pushState;
        window.history.pushState = sinon.stub();
        return RouteManager.triggerRoute(url)
            .then(function () {
                assert.equal(window.history.pushState.args[0][0].path, url, 'history.pushState() was called with correct data history');
                assert.equal(window.history.pushState.args[0][2], url, 'history.pushState() was called with correct url parameter');
                RouteManager.stop();
                window.history.pushState = origPushState;
                loadPageStub.restore();
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
        mockPage.fetchData.returns(Promise.resolve(mockData));
        var pagesContainer = document.createElement('div');
        pagesContainer.classList.add('page-container');
        document.body.appendChild(pagesContainer);
        var RouteManager = require('route-manager')({
            config: routesConfig,
            pagesContainerEl: pagesContainer
        });
        var pageInitializeSpy = sinon.spy(Page.prototype, 'initialize');
        var pageGetDataStub = sinon.stub(Page.prototype, 'fetchData').returns(Promise.resolve({}));
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
        mockPage.fetchData.returns(Promise.resolve());
        RouteManager.start();
        return RouteManager.triggerRoute(pageUrl)
            .then(function () {
                assert.deepEqual(mockPage.getTemplate.args[0], [templateUrl], 'template url was passed to resource manager\'s loadTemplate() method');
                loadPageScript.restore();
                RouteManager.stop();
            });
    });

    it('should pass the data property of the matching route config of the url requested to the associated page\'s fetchData() method', function (done) {
        // setup
        var pageUrl = 'my/real/url';
        var dataUrl = 'get/my/data';
        var routesConfig = {pages: {}};
        routesConfig.pages[pageUrl] = {
            data: dataUrl
        };
        var mockData = {};
        mockPage.getTemplate.returns(Promise.resolve());
        mockPage.fetchData.returns(Promise.resolve(mockData));
        mockPage.load.returns(Promise.resolve());
        mockPage.show.returns(Promise.resolve());
        var RouteManager = require('route-manager')({config: routesConfig});
        var loadPageScriptStub = sinon.stub(RouteManager, 'loadPageScript').returns(Promise.resolve(mockPage));
        RouteManager.start();
        RouteManager.triggerRoute(pageUrl)
            .then(function () {
                assert.deepEqual(mockPage.fetchData.args[0][0], dataUrl, 'page instance\'s fetchData() method was passed requested url');
                assert.deepEqual(mockPage.fetchData.args[0][1], {cache: true}, 'page instance\'s fetchData() method was passed an object with cache set to true');
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
        mockPage.fetchData.returns(Promise.resolve());
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
        mockPage.fetchData.returns(Promise.resolve());
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
        mockPage.fetchData.returns(Promise.resolve());
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
        var pageGetDataStub = sinon.stub(mockPage, 'fetchData').returns(Promise.resolve(pageData));
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
        mockPage.fetchData.returns(Promise.resolve());
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
        var path = 'test';
        sinon.stub(RouteManager, 'getWindow').returns({location: {hash: '#' + path}});
        RouteManager.start();
        assert.deepEqual(RouteManager.getRelativeUrlParams(), [path], 'calling getRelativeUrlParams() before triggering a route returns correct url');
        RouteManager.stop();
        RouteManager.getWindow.restore();
    });

    it('getting current url params when a route has been triggered', function () {
        var routesConfig = {pages: {}};
        var RouteManager = require('route-manager')({config: routesConfig});
        RouteManager.start();
        var url = 'my/url';
        RouteManager.triggerRoute(url);
        assert.deepEqual(RouteManager.getRelativeUrlParams(), ['my', 'url'], 'getRelativeUrlParams() returns correct url params of the url that was triggered');
        RouteManager.stop();
    });

    it('getting current url when a route has been triggered', function () {
        var routesConfig = {pages: {}};
        var RouteManager = require('route-manager')({config: routesConfig});
        RouteManager.start();
        var url = 'my/url';
        RouteManager.triggerRoute(url);
        assert.deepEqual(RouteManager.getRelativeUrl(), url, 'getRelativeUrl() returns correct url that was triggered');
        RouteManager.stop();
    });

    it('getting the current url that contains a leading slash', function () {
        var routesConfig = {pages: {}};
        var RouteManager = require('route-manager')({config: routesConfig});
        RouteManager.start();
        var url = '/leading/slash/url';
        RouteManager.triggerRoute(url);
        assert.deepEqual(RouteManager.getRelativeUrl(), 'leading/slash/url', 'getRelativeUrl() returns the url without the slash');
        RouteManager.stop();
    });

    it('should call loadPage() with new url when pop state changes', function (done) {
        var routesConfig = {pages: {}};
        var popStateListener = window.addEventListener.withArgs('popstate');
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

    it('registerUrl() method should call window.history.pushState() with correct parameters', function () {
        var pageUrl = 'my/real/url';
        var RouteManager = require('route-manager')({config: {}});
        RouteManager.start();
        var origPushState = window.history.pushState;
        window.history.pushState = sinon.stub();
        RouteManager.registerUrl(pageUrl);
        assert.equal(window.history.pushState.args[0][2], pageUrl, 'pushState was called with new url');
        window.history.pushState = origPushState;
        RouteManager.stop();
    });

    it('registerUrl() method should push current window state to RouteManager\'s history', function () {
        var pageUrl = 'my/real/url';
        var RouteManager = require('route-manager')({config: {}});
        var testHistoryState = {my: 'new window state'};
        sinon.stub(RouteManager, 'getWindow').returns({
            history: {
                pushState: sinon.stub(),
                state: testHistoryState
            }
        });
        RouteManager.start();
        RouteManager.registerUrl(pageUrl);
        assert.deepEqual(RouteManager.history[0], testHistoryState);
        RouteManager.stop();
        RouteManager.getWindow.restore();
    });

    it('registerUrl() method should return the registered url as the current path', function () {
        var pageUrl = 'my/real/url';
        var RouteManager = require('route-manager')({config: {}});
        RouteManager.start();
        RouteManager.registerUrl(pageUrl);
        assert.equal(RouteManager.getRelativeUrl(), pageUrl);
        RouteManager.stop();
    });

    it('should load an intercepted url path via onRouteRequest callback instead of the original requested url', function () {
        var secondTestUrl = 'my/second/url';
        var firstPageUrl = 'my/real/url';
        var secondPageRouteRegex = '^' + secondTestUrl;
        var firstPageRouteRegex = '^' + firstPageUrl;
        var firstPageScriptUrl = 'path/to/my/script.js';
        var secondPageScriptUrl = 'path/to/my/script2.js';
        var routesConfig = {pages: {}};
        routesConfig.pages[firstPageRouteRegex] = {script: firstPageScriptUrl};
        routesConfig.pages[secondPageRouteRegex] = {script: secondPageScriptUrl};
        var onRouteRequestStub = sinon.stub();
        var RouteManager = require('route-manager')({
            config: routesConfig,
            onRouteRequest: onRouteRequestStub
        });
        var loadPageStub = sinon.stub(RouteManager, 'loadPage').returns(Promise.resolve(mockPage));
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

    it('should register the new url returned by onRouteRequest callback into history', function () {
        var secondPageUrl = 'my/second/url';
        var firstPageUrl = 'my/real/url';
        var firstPageRouteRegex = '^' + firstPageUrl;
        var secondPageRouteRegex = '^' + secondPageUrl;
        var firstPageScriptUrl = 'path/to/my/script.js';
        var secondPageScriptUrl = 'path/to/my/script2.js';
        var routesConfig = {pages: {}};
        routesConfig.pages[firstPageRouteRegex] = {script: firstPageScriptUrl};
        routesConfig.pages[secondPageRouteRegex] = {script: secondPageScriptUrl};
        var onRouteRequestStub = sinon.stub();
        var RouteManager = require('route-manager')({
            config: routesConfig,
            onRouteRequest: onRouteRequestStub
        });
        var loadPageStub = sinon.stub(RouteManager, 'loadPage').returns(Promise.resolve(mockPage));
        var registerUrlStub = sinon.stub(RouteManager, 'registerUrl');
        RouteManager.start();
        // redirect to new route
        onRouteRequestStub.returns(Promise.resolve(secondPageUrl));
        return RouteManager.triggerRoute(firstPageUrl).then(function () {
            assert.equal(registerUrlStub.args[1][0], secondPageUrl, 'new url was passed to second registerUrl() call');
            RouteManager.stop();
            registerUrlStub.restore();
            loadPageStub.restore();
        });
    });

    it('should register the original url into history even if onRouteRequest callback returns a new url', function () {
        var secondTestUrl = 'my/second/url';
        var firstPageUrl = 'my/real/url';
        var firstPageRouteRegex = '^' + firstPageUrl;
        var secondPageRouteRegex = '^' + secondTestUrl;
        var firstPageScriptUrl = 'path/to/my/script.js';
        var secondPageScriptUrl = 'path/to/my/script2.js';
        var routesConfig = {pages: {}};
        routesConfig.pages[firstPageRouteRegex] = {script: firstPageScriptUrl};
        routesConfig.pages[secondPageRouteRegex] = {script: secondPageScriptUrl};
        var onRouteRequestStub = sinon.stub();
        var RouteManager = require('route-manager')({
            config: routesConfig,
            onRouteRequest: onRouteRequestStub
        });
        var loadPageStub = sinon.stub(RouteManager, 'loadPage').returns(Promise.resolve(mockPage));
        var registerUrlStub = sinon.stub(RouteManager, 'registerUrl');
        RouteManager.start();
        // redirect to new route
        onRouteRequestStub.returns(Promise.resolve(secondTestUrl));
        return RouteManager.triggerRoute(firstPageUrl).then(function () {
            assert.equal(registerUrlStub.args[0][0], firstPageUrl, 'original url was added to history');
            RouteManager.stop();
            loadPageStub.restore();
            registerUrlStub.restore();
        });
    });


    it('should call hide method on a previous page when a new page is requested', function () {
        var firstPageUrl = 'my/page/url';
        var secondPageUrl = 'two/second/page';
        var routesConfig = {pages: {}};
        var firstPageScriptUrl = 'path/to/page/script';
        var secondPageScriptUrl = 'second/path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        routesConfig.pages[firstPageUrl] = {
            template: pageTemplateUrl,
            script: firstPageScriptUrl
        };
        routesConfig.pages[secondPageUrl] = {
            template: pageTemplateUrl,
            script: secondPageScriptUrl
        };
        var RouteManager = require('route-manager')({config: routesConfig});
        var secondMockPage = createPageStub(Page);
        requireStub.withArgs(firstPageScriptUrl).returns(mockPage);
        requireStub.withArgs(secondPageScriptUrl).returns(secondMockPage);
        RouteManager.start();
        return RouteManager.triggerRoute(firstPageUrl).then(function () {
            // register first url into window state
            RouteManager.history = [{path: firstPageUrl}];
            return RouteManager.triggerRoute(secondPageUrl).then(function () {
                assert.equal(mockPage.hide.callCount, 1);
                RouteManager.stop();
            });
        });
    });

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

    it('should only load global modules one, even when module is assigned to multiple pages in routes config', function () {
        // setup
        var pageUrl = 'my/page/url';
        var secondPageUrl = 'second/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleHtml = "<div>my module content</div>";
        var moduleTemplateUrl = 'url/to/my/template';
        routesConfig.modules[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        routesConfig.pages[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        routesConfig.pages[secondPageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var pagesContainer = document.createElement('div');
        var RouteManager = require('route-manager')({config: routesConfig, pagesContainerEl: pagesContainer});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.withArgs(moduleTemplateUrl).returns(Promise.resolve(moduleHtml));
        requireStub.returns(mockModule);
        mockModule.appendEl = sinon.spy();
        RouteManager.start();
        return RouteManager.triggerRoute(pageUrl).then(function () {
            return RouteManager.triggerRoute(secondPageUrl).then(function () {
                assert.equal(mockModule.load.callCount, 1,  'load call was only triggered once even though module appears on multiple pages');
                RouteManager.stop();
            });
        });
    });

    it('should call global module\'s appendEl() method with correct parameters once', function () {
        // setup
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleHtml = "<div>my module content</div>";
        var moduleTemplateUrl = 'url/to/my/template';
        routesConfig.modules[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
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
        var pagesContainer = document.createElement('div');
        var RouteManager = require('route-manager')({config: routesConfig, pagesContainerEl: pagesContainer});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.withArgs(moduleTemplateUrl).returns(Promise.resolve(moduleHtml));
        mockModule.appendEl = sinon.spy();
        requireStub.returns(mockModule);
        RouteManager.start();
        return RouteManager.triggerRoute(pageUrl).then(function () {
            assert.equal(mockModule.appendEl.args[0][0].outerHTML, moduleHtml,  'module\'s appendEl() call was triggered with el containing correct html content');
            RouteManager.stop();
        });
    });

    it('should call global module\'s appendEl() method with correct parameters once, even when specified for multiple pages', function () {
        var pageUrl = 'my/page/url';
        var secondPageUrl = 'second/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var moduleName = 'customModule';
        var moduleScriptUrl = 'path/to/module/script';
        var moduleHtml = "<div>my module content</div>";
        var moduleTemplateUrl = 'url/to/my/template';
        routesConfig.modules[moduleName] = {
            template: moduleTemplateUrl,
            script: moduleScriptUrl,
            global: true
        };
        var pageScriptUrl = 'path/to/page/script';
        var pageTemplateUrl = 'url/to/my/template';
        routesConfig.pages[pageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        routesConfig.pages[secondPageUrl] = {
            template: pageTemplateUrl,
            modules: [moduleName],
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var pagesContainer = document.createElement('div');
        var RouteManager = require('route-manager')({config: routesConfig, pagesContainerEl: pagesContainer});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        mockModule.getTemplate.withArgs(moduleTemplateUrl).returns(Promise.resolve(moduleHtml));
        mockModule.appendEl = sinon.spy();
        requireStub.returns(mockModule);
        RouteManager.start();
        return RouteManager.triggerRoute(pageUrl).then(function () {
            return RouteManager.triggerRoute(secondPageUrl).then(function () {
                assert.equal(mockModule.appendEl.callCount, 1,  'module\'s appendEl() call was only triggered once');
                RouteManager.stop();
            });
        });
    });

    it('all modules associated with a page should show() when requesting a url to a page that has the modules designated', function () {
        // setup
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var firstModuleName = 'myFIRSTCustomModule';
        var firstModuleScriptUrl = 'path/to/first/script';
        var secondModuleName = 'myCustomModule2';
        var secondModuleScriptUrl = 'second/path/to/second/script';
        routesConfig.modules[firstModuleName] = {
            script: firstModuleScriptUrl
        };
        routesConfig.modules[secondModuleName] = {
            script: secondModuleScriptUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        routesConfig.pages[pageUrl] = {
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
        var firstMockModule = new Module();
        var firstModuleShowSpy = sinon.spy(firstMockModule, 'show');
        var secondMockModule = new Module();
        var secondModuleShowSpy = sinon.spy(secondMockModule, 'show');
        requireStub.withArgs(firstModuleScriptUrl).returns(firstMockModule);
        requireStub.withArgs(secondModuleScriptUrl).returns(secondMockModule);
        RouteManager.start();
        return RouteManager.triggerRoute(pageUrl).then(function () {
            assert.equal(firstModuleShowSpy.callCount, 1, 'first modules show() method was called');
            assert.equal(secondModuleShowSpy.callCount, 1, 'second modules show() method was called');
            RouteManager.stop();
        });
    });

    it('all modules associated with a page should hide() when navigation away from it', function () {
        // setup
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var firstModuleName = 'myFIRSTCustomModule';
        var firstModuleScriptUrl = 'path/to/first/script';
        var secondModuleName = 'myCustomModule2';
        var secondModuleScriptUrl = 'second/path/to/second/script';
        routesConfig.modules[firstModuleName] = {
            script: firstModuleScriptUrl
        };
        routesConfig.modules[secondModuleName] = {
            script: secondModuleScriptUrl
        };
        var pageScriptUrl = 'path/to/page/script';
        routesConfig.pages[pageUrl] = {
            modules: [
                secondModuleName,
                firstModuleName
            ],
            script: pageScriptUrl
        };
        var secondPageUrl = 'path/to/second/page';
        routesConfig.pages[secondPageUrl] = {
            script: pageScriptUrl
        };
        var pageHtml = '<div></div>';
        mockPage.getTemplate.returns(Promise.resolve(pageHtml));
        var RouteManager = require('route-manager')({config: routesConfig});
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        var firstMockModule = new Module();
        var firstModuleHideStub = sinon.stub(firstMockModule, 'hide').returns(Promise.resolve());
        var secondMockModule = new Module();
        var secondModuleHideStub = sinon.stub(secondMockModule, 'hide').returns(Promise.resolve());
        requireStub.withArgs(firstModuleScriptUrl).returns(firstMockModule);
        requireStub.withArgs(secondModuleScriptUrl).returns(secondMockModule);
        RouteManager.start();
        return RouteManager.triggerRoute(pageUrl).then(function () {
            // register first url into window state
            RouteManager.history = [{path: pageUrl}];
            return RouteManager.triggerRoute(secondPageUrl).then(function () {
                assert.equal(firstModuleHideStub.callCount, 1, 'first modules hide() method was called');
                assert.equal(secondModuleHideStub.callCount, 1, 'second modules hide() method was called');
                RouteManager.stop();
            });
        });
    });

    it('navigating back to a previously loaded page, after navigating away, cause page\'s show method again', function () {
        var pageUrl = 'my/page/url';
        var routesConfig = {pages: {}, modules: {}};
        var pageScriptUrl = 'path/to/page/script';
        var secondPageScript = 'second/path/to/page/script';
        routesConfig.pages[pageUrl] = {
            script: pageScriptUrl
        };
        var secondPageUrl = 'path/to/second/page';
        routesConfig.pages[secondPageUrl] = {
            script: secondPageScript
        };
        var RouteManager = require('route-manager')({config: routesConfig});
        var secondPageInstance = new Page();
        requireStub.withArgs(pageScriptUrl).returns(mockPage);
        requireStub.withArgs(secondPageScript).returns(secondPageInstance);
        RouteManager.start();
        var firstPageShowCount = 0;
        return RouteManager.triggerRoute(pageUrl).then(function () {
            firstPageShowCount++;
            return RouteManager.triggerRoute(secondPageUrl).then(function () {
                return RouteManager.triggerRoute(pageUrl).then(function () {
                firstPageShowCount++;
                    assert.equal(mockPage.show.callCount, firstPageShowCount, 'first page show() method was called twice');
                    RouteManager.stop();
                });
            });
        });
    });


});
