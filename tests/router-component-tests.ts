import sinon from 'sinon';
import { expect, fixture, html } from '@open-wc/testing';
// eslint-disable-next-line no-unused-vars
import { extractPathParams, RouterComponent } from '../src/router-component';

const origDocTitle = document.title;
const originalPathName = document.location.pathname;

describe('Router Component', () => {
    let consoleWarn;
    beforeEach(() => {
        consoleWarn = sinon.stub(console, 'warn');
    });

    afterEach(() => {
        document.title = origDocTitle;
        history.pushState({}, origDocTitle, originalPathName);
        consoleWarn.restore();
    });

    it('should remove all children from the dom when instantiated if none match the current route', async () => {
        const component: RouterComponent = await fixture(html`
            <router-component>
                <first-page path="/page1"></first-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/');
        console.log(document.body.querySelector('first-page'));
        expect(document.body.querySelector('first-page')).to.be.undefined;
        component.remove();
    });

    // it('should show the route that has a path that matches when initial window location is /', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path=".*"></first-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/');
    //     document.body.appendChild(tpl.content);
    //     const firstPage = document.body.querySelector('first-page');
    //     assert.deepEqual(firstPage.parentElement, component);
    //     component.remove();
    // });

    // it('should show the correct route element when navigating to a multi-segment path', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/test/one"></first-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/test/one');
    //     document.body.appendChild(tpl.content);
    //     const firstPage = document.body.querySelector('first-page');
    //     assert.deepEqual(firstPage.parentElement, component);
    //     component.remove();
    // });

    // it('should show the route that has a relative path that matches the end of the initial window location pathnname', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="page1"></first-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/test/path/page1');
    //     document.body.appendChild(tpl.content);
    //     const firstPage = document.body.querySelector('first-page');
    //     assert.deepEqual(firstPage.parentElement, component);
    //     component.remove();
    // });

    // it('should show the route whose path and search params matches the current window location and its search params ', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="page1" search-params="foo=bar"></first-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1?foo=bar');
    //     document.body.appendChild(tpl.content);
    //     const firstPage = document.body.querySelector('first-page');
    //     assert.deepEqual(firstPage.parentElement, component);
    //     component.remove();
    // });

    // it('should show the route whose path and search params regex matches the current window location and its search params ', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="page1" search-params="foo=[bar|baz]"></first-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1?foo=baz');
    //     document.body.appendChild(tpl.content);
    //     assert.ok(document.body.querySelector('first-page'));
    //     component.remove();
    // });

    // it('should show only the child that has a path that matches the current location', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     const firstPage = document.body.querySelector('first-page');
    //     assert.deepEqual(firstPage.parentElement, component);
    //     assert.ok(!document.body.querySelector('second-page'));
    //     component.remove();
    // });

    // it('should switch to the child that has the path that matches the current location after popstate has been called', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     window.history.pushState({}, document.title, '/page2');
    //     const popstate = new PopStateEvent('popstate', { state: {} });
    //     window.dispatchEvent(popstate);
    //     assert.ok(!document.body.querySelector('first-page'));
    //     assert.ok(document.body.querySelector('second-page'));
    //     component.remove();
    // });

    // it('should show a warning when attempting to go to a route that is not handled after popstate is called', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     const newPath = 'nope';
    //     component.show(newPath);
    //     assert.deepEqual(consoleWarn.args[0], [
    //         `Navigated to path "${newPath}" but there is no matching ` +
    //             `element with a path that matches. Maybe you should implement a catch-all route with the path attribute of ".*"?`
    //     ]);
    //     component.remove();
    // });

    // it('should show the child whose path matches the catch all url', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/test/*"></first-page>
    //             <second-page path="/*"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     assert.ok(!document.body.querySelector('first-page'));
    //     assert.ok(document.body.querySelector('second-page'));
    //     component.remove();
    // });

    // it('should continue to show the current page and not show a warning when show has been called with the same url', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     const pathname = '/page1';
    //     window.history.pushState({}, document.title, pathname);
    //     document.body.appendChild(tpl.content);
    //     component.show(pathname);
    //     assert.equal(consoleWarn.callCount, 0);
    //     assert.ok(document.body.querySelector('first-page'));
    //     assert.ok(!document.body.querySelector('second-page'));
    //     component.remove();
    // });

    // it('should show first route that matches the current page even if other routes match', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page/*"></first-page>
    //             <second-page path="/page/2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page');
    //     document.body.appendChild(tpl.content);
    //     // showing first page
    //     component.show('/page/2');
    //     assert.ok(document.body.querySelector('first-page'));
    //     assert.ok(!document.body.querySelector('second-page'));
    //     component.remove();
    // });

    // it('should switch to the child that has the path that matches the current location after link has been clicked', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="/page2">To page 2</a>
    //             </first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     document.body.appendChild(tpl.content);
    //     window.history.pushState({}, document.title, '/page1');
    //     const firstPageLink = document.querySelector('first-page a') as HTMLAnchorElement;
    //     firstPageLink.click();
    //     assert.ok(!document.body.querySelector('first-page'));
    //     assert.ok(document.body.querySelector('second-page'));
    //     component.remove();
    // });

    // it('should switch to the / route if clicking a link that has / as its pathname', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="/">To home</a>
    //             </first-page>
    //             <home-page path="/"></home-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     const firstPageLink = document.querySelector('first-page a') as HTMLAnchorElement;
    //     firstPageLink.click();
    //     assert.ok(!document.body.querySelector('first-page'));
    //     assert.ok(document.body.querySelector('home-page'));
    //     component.remove();
    // });

    // it('should switch to the catch all route that has the path that matches the current location after link has been clicked', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="/">To fallback page</a>
    //             </first-page>
    //             <fallback-page path=".*"></fallback-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     document.body.appendChild(tpl.content);
    //     window.history.pushState({}, document.title, '/page1');
    //     const firstPageLink = document.querySelector('first-page a') as HTMLAnchorElement;
    //     firstPageLink.click();
    //     assert.ok(!document.body.querySelector('first-page'));
    //     assert.ok(document.body.querySelector('fallback-page'));
    //     component.remove();
    // });

    // it('should continue to show current page when clicking a link with a non-relative href', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="http://test.com/blah">To page 2</a>
    //             </first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     const firstPageLink = document.querySelector('first-page a');
    //     const evt = new Event('click');
    //     evt.preventDefault();
    //     firstPageLink.dispatchEvent(evt);
    //     assert.ok(document.body.querySelector('first-page'));
    //     assert.ok(!document.body.querySelector('second-page'));
    //     component.remove();
    // });

    // it('should switch to the path that matches the current location after calling pushState', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     const state = { my: 'state' };
    //     const pageTitle = 'the title';
    //     const url = '/page2';
    //     window.history.pushState(state, pageTitle, url);
    //     assert.ok(!document.body.querySelector('first-page'));
    //     assert.ok(document.body.querySelector('second-page'));
    //     component.remove();
    // });

    // it('should switch to the path that matches the current location after calling replaceState', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     const state = { my: 'state' };
    //     const pageTitle = 'the title';
    //     const url = '/page2';
    //     window.history.replaceState(state, pageTitle, url);
    //     assert.ok(!document.body.querySelector('first-page'));
    //     assert.ok(document.body.querySelector('second-page'));
    //     component.remove();
    // });

    // it('should update the document title that matches the current location after calling pushState', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1" document-title="Test1"></first-page>
    //             <second-page path="/page2" document-title="Test2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     assert.equal(document.title, 'Test1');
    //     const state = { my: 'state' };
    //     const pageTitle = 'the title';
    //     const url = '/page2';
    //     window.history.pushState(state, pageTitle, url);
    //     assert.equal(document.title, 'Test2');
    //     component.remove();
    // });

    // it('should fire route-changed event when routes are changed', () => {
    //     const tpl = document.createElement('template');
    //     const routeChangedSpy = sinon.spy();
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     component.addEventListener('route-changed', routeChangedSpy);
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     assert.equal(routeChangedSpy.callCount, 1);
    //     const state = { my: 'state' };
    //     const pageTitle = 'the title';
    //     const url = '/page2';
    //     window.history.pushState(state, pageTitle, url);
    //     assert.equal(routeChangedSpy.callCount, 2);
    //     component.remove();
    //     assert.equal(routeChangedSpy.callCount, 2);
    // });

    // it('should change to appropriate routes when nested routes exist', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <nested-second-page path="/nested/pages$">
    //                 <router-component>
    //                   <nested-one path="/nested/pages/1"></nested-one>
    //                   <nested-two path="/nested/pages/2"></nested-two>
    //                 </router-component>
    //             </nested-second-page>
    //         </router-component>
    //     `;
    //     const parentRouter = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1'); // ensure we start on first page
    //     document.body.appendChild(tpl.content);
    //     window.history.pushState({}, document.title, '/nested/pages');
    //     const childRouter = parentRouter.querySelector('router-component') as RouterComponent;
    //     assert.equal(childRouter.children.length, 0);
    //     window.history.pushState({}, document.title, '/nested/pages/2');
    //     assert.ok(childRouter.querySelector('nested-two'));
    //     parentRouter.remove();
    // });

    // it('should only call on router show once per click', () => {
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="/page2">To page 2</a>
    //             </first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     const showSpy = sinon.spy(component, 'show');
    //     const firstPage = document.querySelector('first-page');
    //     assert.equal(showSpy.callCount, 0);
    //     const firstPageLink = firstPage.querySelector('a');
    //     firstPageLink.click();
    //     assert.equal(showSpy.callCount, 1);
    //     component.remove();
    // });

    // it('should re-render the route again if requested path matches the pattern of the current route but is a different path', () => {
    //     const connectedCallbackSpy = sinon.spy();
    //     const disconnectedCallbackSpy = sinon.spy();
    //     customElements.define(
    //         'test-page',
    //         class extends HTMLElement {
    //             connectedCallback() {
    //                 connectedCallbackSpy();
    //             }
    //             disconnectedCallback() {
    //                 disconnectedCallbackSpy();
    //             }
    //         }
    //     );
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <test-page path="/page[0-9]"></test-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     connectedCallbackSpy.resetHistory();
    //     disconnectedCallbackSpy.resetHistory();
    //     const page = document.body.querySelector('test-page');
    //     assert.ok(page);
    //     window.history.pushState({}, document.title, '/page2');
    //     assert.equal(connectedCallbackSpy.callCount, 1);
    //     assert.equal(disconnectedCallbackSpy.callCount, 1);
    //     component.remove();
    // });

    // it('should re-render the route again if clicking to a path matches the pattern of the current route', () => {
    //     const connectedCallbackSpy = sinon.spy();
    //     const disconnectedCallbackSpy = sinon.spy();
    //     customElements.define(
    //         'test-click-page', // tslint:disable:max-classes-per-file
    //         class extends HTMLElement {
    //             connectedCallback() {
    //                 connectedCallbackSpy();
    //             }
    //             disconnectedCallback() {
    //                 disconnectedCallbackSpy();
    //             }
    //         }
    //     );
    //     const tpl = document.createElement('template');
    //     tpl.innerHTML = `
    //         <router-component>
    //             <test-click-page path="/page[0-9]">
    //                 <a href="/page2">To page 2</a>
    //             </test-click-page>
    //         </router-component>
    //     `;
    //     const component = tpl.content.querySelector('router-component') as RouterComponent;
    //     window.history.pushState({}, document.title, '/page1');
    //     document.body.appendChild(tpl.content);
    //     const firstPage = document.querySelector('test-click-page');
    //     connectedCallbackSpy.resetHistory();
    //     disconnectedCallbackSpy.resetHistory();
    //     const firstPageLink = firstPage.querySelector('a');
    //     firstPageLink.click();
    //     assert.equal(connectedCallbackSpy.callCount, 1);
    //     assert.equal(disconnectedCallbackSpy.callCount, 1);
    //     component.remove();
    // });

    // describe('when triggerRouteChange is set to false when pushing new state', () => {
    //     let component;

    //     beforeEach(() => {
    //         const tpl = document.createElement('template');
    //         tpl.innerHTML = `
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `;
    //         component = tpl.content.querySelector('router-component') as RouterComponent;
    //         window.history.pushState({}, document.title, '/page1');
    //         document.body.appendChild(tpl.content);
    //     });

    //     afterEach(() => {
    //         component.remove();
    //     });

    //     it('should update the window pathname', () => {
    //         window.history.pushState({ triggerRouteChange: false }, null, '/page3');
    //         assert.equal(location.pathname, '/page3');
    //     });

    //     it('should cleanup the triggerRouteChange from the history state', () => {
    //         window.history.pushState({ triggerRouteChange: false }, null, '/page3');
    //         assert.equal(history.state.triggerRouteChange, undefined);
    //     });

    //     it('should not call console warning', () => {
    //         window.history.pushState({ triggerRouteChange: false }, null, '/page3');
    //         assert.equal(consoleWarn.callCount, 0);
    //     });

    //     it('should not fire a route change event', () => {
    //         const routeChangedSpy = sinon.spy();
    //         component.addEventListener('route-changed', routeChangedSpy);
    //         window.history.pushState({ triggerRouteChange: false }, null, '/page3');
    //         assert.equal(routeChangedSpy.callCount, 0);
    //     });

    //     it('should continue to show current route that was showing before pushState call', () => {
    //         window.history.pushState({ triggerRouteChange: false }, null, '/page3');
    //         assert.equal(consoleWarn.callCount, 0);
    //         assert.ok(document.body.querySelector('first-page'));
    //         assert.ok(!document.body.querySelector('second-page'));
    //     });

    //     it('should not change the route if null is passed as the state', () => {
    //         window.history.pushState(null, null, '/page3');
    //         assert.ok(document.body.querySelector('first-page'));
    //     });
    //     it('should go back to previous route and continue to show previous page when requested', () => {
    //         window.history.pushState({ triggerRouteChange: false }, null, '/page3');
    //         window.history.pushState({}, null, '/page1');
    //         assert.equal(location.pathname, '/page1');
    //         assert.ok(document.body.querySelector('first-page'));
    //     });
    // });

    // describe('extractPathParams', () => {
    //     it('returns the captured groups of the string with the supplied regex', () => {
    //         const testPath = 'test';
    //         const id = '8';
    //         assert.deepEqual(extractPathParams('([a-z]+)/([0-9])', `${testPath}/${id}`), [testPath, id]);
    //     });
    // });
});
