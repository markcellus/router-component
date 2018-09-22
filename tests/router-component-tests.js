import '../src/router-component';
import '../node_modules/chai/chai.js';

const { assert } = chai;

describe('Router Component', function () {

    it('should remove all children from the dom when instantiated', function () {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {}
        });
        component.innerHTML = '<first-page path="/page1"></first-page>';
        document.body.appendChild(component);
        assert.ok(!document.body.querySelector('first-page'));
        component.remove();
    });

    it('should show the route that has a path that matches when initial window location is /', function () {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/'
            }
        });
        component.innerHTML = `
            <first-page path="*"></first-page>
        `;
        document.body.appendChild(component);
        const firstPage = document.body.querySelector('first-page');
        assert.deepEqual(firstPage.parentElement, component);
        component.remove();
    });

    it('should show the route that has a relative path that matches the end of the initial window location pathnname', function () {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/test/path/page1'
            }
        });
        component.innerHTML = `
            <first-page path="page1"></first-page>
        `;
        document.body.appendChild(component);
        const firstPage = document.body.querySelector('first-page');
        assert.deepEqual(firstPage.parentElement, component);
        component.remove();
    });

    it('should show only the child that has a path that matches the current location', function () {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/page1'
            }
        });
        component.innerHTML = `
            <first-page path="/page1"></first-page>
            <second-page path="/page2"></second-page>
        `;
        document.body.appendChild(component);
        const firstPage = document.body.querySelector('first-page');
        assert.deepEqual(firstPage.parentElement, component);
        assert.ok(!document.body.querySelector('second-page'));
        component.remove();
    });

    it('should switch to the child that has the path that matches the current location after popstate has been called', function () {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/page1'
            },
            configurable: true
        });
        component.innerHTML = `
            <first-page path="/page1"></first-page>
            <second-page path="/page2"></second-page>
        `;
        document.body.appendChild(component);
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/page2'
            }
        });
        const popstate = new PopStateEvent('popstate', { state: {} });
        window.dispatchEvent(popstate);
        assert.ok(!document.body.querySelector('first-page'));
        assert.ok(document.body.querySelector('second-page'));
        component.remove();
    });

    it('should throw an error when attempting to go to a route that is not handled after popstate is called', function () {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/page1'
            },
        });
        component.innerHTML = `
            <first-page path="/page1"></first-page>
            <second-page path="/page2"></second-page>
        `;
        document.body.appendChild(component);
        const newPath = 'nope';
        assert.throws(() => component.show(newPath), Error, `Navigated to path "${newPath}" but there is no matching ` +
            `element with a path that matches. Maybe you should implement a catch-all route with the path attribute of "*"?`);
        component.remove();
    });

    it('should show the child whose path matches the catch all url', function () {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/page1'
            }
        });
        component.innerHTML = `
            <first-page path="/test/*"></first-page>
            <second-page path="/*"></second-page>
        `;
        document.body.appendChild(component);
        assert.ok(!document.body.querySelector('first-page'));
        assert.ok(document.body.querySelector('second-page'));
        component.remove();
    });

    it('should continue to show the current page and not display an error when show has been called with the same url', function () {
        const component = document.createElement('router-component');
        const pathname = '/page1';
        Object.defineProperty(component, 'location', {
            value: {pathname},
        });
        component.innerHTML = `
            <first-page path="/page1"></first-page>
            <second-page path="/page2"></second-page>
        `;
        document.body.appendChild(component);
        assert.doesNotThrow(() => component.show(pathname));
        assert.ok(document.body.querySelector('first-page'));
        assert.ok(!document.body.querySelector('second-page'));
        component.remove();
    });

    it('should show first route that matches the current page even if other routes match', function () {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {pathname: '/page'},
        });
        component.innerHTML = `
            <first-page path="/page/*"></first-page>
            <second-page path="/page/2"></second-page>
        `;
        document.body.appendChild(component);
        // showing first page
        assert.doesNotThrow(() => component.show('/page/2'));
        assert.ok(document.body.querySelector('first-page'));
        assert.ok(!document.body.querySelector('second-page'));
        component.remove();
    });

    it('should switch to the child that has the path that matches the current location after link has been clicked', function (done) {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/page1'
            },
        });
        component.innerHTML = `
            <first-page path="/page1">
                <a href="/page2">To page 2</a>
            </first-page>
            <second-page path="/page2"></second-page>
        `;
        document.body.appendChild(component);
        const firstPageLink = document.querySelector('first-page a');
        // wait
        const timer = setTimeout(() => {
            debugger;
            firstPageLink.click();
            assert.ok(!document.body.querySelector('first-page'));
            assert.ok(document.body.querySelector('second-page'));
            component.remove();
            clearTimeout(timer);
            done();
        }, 201);
    });

    it('should switch to the / route if clicking a link that has / as its pathname', function (done) {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/page1'
            },
        });
        component.innerHTML = `
            <first-page path="/page1">
                <a href="/">To home</a>
            </first-page>
            <home-page path="/"></home-page>
        `;
        document.body.appendChild(component);
        const firstPageLink = document.querySelector('first-page a');
        // wait
        const timer = setTimeout(() => {
            firstPageLink.click();
            assert.ok(!document.body.querySelector('first-page'));
            assert.ok(document.body.querySelector('home-page'));
            component.remove();
            clearTimeout(timer);
            done();
        }, 201);
    });

    it('should switch to the catch all route that has the path that matches the current location after link has been clicked', function (done) {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/page1'
            },
        });
        component.innerHTML = `
            <first-page path="/page1">
                <a href="/">To fallback page</a>
            </first-page>
            <fallback-page path="*"></fallback-page>
        `;
        document.body.appendChild(component);
        const firstPageLink = document.querySelector('first-page a');
        // wait
        const timer = setTimeout(() => {
            firstPageLink.click();
            assert.ok(!document.body.querySelector('first-page'));
            assert.ok(document.body.querySelector('fallback-page'));
            component.remove();
            clearTimeout(timer);
            done();
        }, 201);
    });

    it('should continue to show current page when clicking a link with a non-relative href', function (done) {
        const component = document.createElement('router-component');
        Object.defineProperty(component, 'location', {
            value: {
                pathname: '/page1'
            },
        });
        component.innerHTML = `
            <first-page path="/page1">
                <a href="http://test.com/blah">To page 2</a>
            </first-page>
            <second-page path="/page2"></second-page>
        `;
        document.body.appendChild(component);
        const firstPageLink = document.querySelector('first-page a');
        // wait
        const timer = setTimeout(() => {
            const evt = new Event('click');
            evt.preventDefault();
            firstPageLink.dispatchEvent(evt);
            assert.ok(document.body.querySelector('first-page'));
            assert.ok(!document.body.querySelector('second-page'));
            component.remove();
            clearTimeout(timer);
            done();
        }, 201);
    });
});
