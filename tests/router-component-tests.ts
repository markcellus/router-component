import sinon from 'sinon';
import { expect, fixture, html } from '@open-wc/testing';
// eslint-disable-next-line no-unused-vars
import { extractPathParams, RouterComponent } from '../src/router-component';

const origDocTitle = document.title;
const originalPathName = document.location.pathname;

describe('<router-component>', async () => {
    let consoleWarn;
    beforeEach(() => {
        consoleWarn = sinon.stub(console, 'warn');
    });

    afterEach(() => {
        document.title = origDocTitle;
        history.pushState({}, origDocTitle, originalPathName);
        consoleWarn.restore();
    });

    // it('removes all children from the dom when instantiated if none match the current route', async () => {
    //     await fixture(html`
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //         </router-component>
    //     `);
    //     window.history.pushState({}, document.title, '/');
    //     console.log(document.body.querySelector('first-page'));
    //     expect(document.body.querySelector('first-page')).to.be.null;
    // });

    it('shows the route that has a path that matches when initial window location is /', async () => {
        const component: RouterComponent = await fixture(html`
            <router-component>
                <first-page path=".*"></first-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/');
        const firstPage = document.body.querySelector('first-page');
        expect(firstPage.parentElement).to.deep.equal(component);
    });

    it('shows the correct route element when navigating to a multi-segment path', async () => {
        const component: RouterComponent = await fixture(html`
            <router-component>
                <first-page path="/test/one"></first-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/test/one');
        const firstPage = document.body.querySelector('first-page');
        expect(firstPage.parentElement).to.deep.equal(component);
    });

    it('shows the route that has a relative path that matches the end of the initial window location pathnname', async () => {
        const component: RouterComponent = await fixture(html`
            <router-component>
                <first-page path="page1"></first-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/test/path/page1');
        const firstPage = document.body.querySelector('first-page');
        expect(firstPage.parentElement).to.deep.equal(component);
    });

    it('shows the route whose path and search params matches the current window location and its search params ', async () => {
        const component: RouterComponent = await fixture(html`
            <router-component>
                <first-page path="page1" search-params="foo=bar"></first-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/page1?foo=bar');
        const firstPage = document.body.querySelector('first-page');
        expect(firstPage.parentElement).to.deep.equal(component);
    });

    it('shows the route whose path and search params regex matches the current window location and its search params ', async () => {
        await fixture(html`
            <router-component>
                <first-page path="page1" search-params="foo=[bar|baz]"></first-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/page1?foo=baz');
        expect(document.body.querySelector('first-page')).to.not.be.null;
    });

    // it('shows only the child that has a path that matches the current location', async () => {
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);
    //     window.history.pushState({}, document.title, '/page1');
    //     const firstPage = document.body.querySelector('first-page');
    //     expect(firstPage.parentElement).to.deep.equal(component);
    //     expect(document.body.querySelector('second-page')).to.be.null;
    // });

    // it('switches to the child that has the path that matches the current location after popstate has been called', async () => {
    //     await fixture(html`
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);

    //     window.history.pushState({}, document.title, '/page1');
    //     window.history.pushState({}, document.title, '/page2');
    //     const popstate = new PopStateEvent('popstate', { state: {} });
    //     window.dispatchEvent(popstate);
    //     expect(document.body.querySelector('first-page')).to.be.null;
    //     expect(document.body.querySelector('second-page')).to.not.be.null;
    // });

    // it('shows a warning when attempting to go to a route that is not handled after popstate is called', async () => {
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);

    //     window.history.pushState({}, document.title, '/page1');
    //     const newPath = 'nope';
    //     component.show(newPath);
    //     expect(consoleWarn.args[0]).to.deep.equal([
    //         `Navigated to path "${newPath}" but there is no matching ` +
    //             `element with a path that matches. Maybe you should implement a catch-all route with the path attribute of ".*"?`
    //     ]);
    // });

    // it('shows the child whose path matches the catch all url', async () => {
    //     await fixture(html`
    //         <router-component>
    //             <first-page path="/test/*"></first-page>
    //             <second-page path="/*"></second-page>
    //         </router-component>
    //     `);
    //     window.history.pushState({}, document.title, '/page1');
    //     expect(document.body.querySelector('first-page')).to.be.null;
    //     expect(document.body.querySelector('second-page')).to.not.be.null;
    // });

    // it('should continue to show the current page and not show a warning when show has been called with the same url', async () => {
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);

    //     const pathname = '/page1';
    //     window.history.pushState({}, document.title, pathname);
    //     component.show(pathname);
    //     expect(consoleWarn.callCount).to.equal(0);
    //     expect(document.body.querySelector('first-page')).to.not.be.null;
    //     expect(document.body.querySelector('second-page')).to.be.null;
    // });

    // it('shows first route that matches the current page even if other routes match', async () => {
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page/*"></first-page>
    //             <second-page path="/page/2"></second-page>
    //         </router-component>
    //     `);
    //     window.history.pushState({}, document.title, '/page');
    //     // showing first page
    //     component.show('/page/2');
    // expect(document.body.querySelector('first-page')).to.not.be.null;
    // expect(document.body.querySelector('second-page')).to.be.null;
    // });

    // it('switches to the child that has the path that matches the current location after link has been clicked', async () => {
    //     await fixture(html`
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="/page2">To page 2</a>
    //             </first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);

    //     window.history.pushState({}, document.title, '/page1');
    //     const firstPageLink = document.querySelector('first-page a') as HTMLAnchorElement;
    //     firstPageLink.click();
    //     expect(document.body.querySelector('first-page')).to.be.null;
    //     expect(document.body.querySelector('second-page')).to.not.be.null;
    // });

    // it('switches to the / route if clicking a link that has / as its pathname', async () => {
    //     await fixture(html`
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="/">To home</a>
    //             </first-page>
    //             <home-page path="/"></home-page>
    //         </router-component>
    //     `);

    //     window.history.pushState({}, document.title, '/page1');
    //     const firstPageLink = document.querySelector('first-page a') as HTMLAnchorElement;
    //     firstPageLink.click();
    //     expect(document.body.querySelector('first-page')).to.be.null;
    //     expect(document.body.querySelector('home-page')).to.not.be.null;
    // });

    // it('switches to the catch all route that has the path that matches the current location after link has been clicked', async () => {
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="/">To fallback page</a>
    //             </first-page>
    //             <fallback-page path=".*"></fallback-page>
    //         </router-component>
    //     `);

    //     window.history.pushState({}, document.title, '/page1');
    //     const firstPageLink = document.querySelector('first-page a') as HTMLAnchorElement;
    //     firstPageLink.click();
    //     expect(document.body.querySelector('first-page')).to.be.null;
    //     assert.ok(document.body.querySelector('fallback-page'));
    // });

    // it('should continue to show current page when clicking a link with a non-relative href', async() => {
    //     const tpl = document.createElement('template');
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="http://test.com/blah">To page 2</a>
    //             </first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);
    //
    //     window.history.pushState({}, document.title, '/page1');
    //
    //     const firstPageLink = document.querySelector('first-page a');
    //     const evt = new Event('click');
    //     evt.preventDefault();
    //     firstPageLink.dispatchEvent(evt);
    //     expect(document.body.querySelector('first-page')).to.not.be.null;
    //     expect(document.body.querySelector('second-page')).to.be.null;
    //
    // });

    // it('switches to the path that matches the current location after calling pushState', async() => {
    //     const tpl = document.createElement('template');
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);
    //
    //     window.history.pushState({}, document.title, '/page1');
    //
    //     const state = { my: 'state' };
    //     const pageTitle = 'the title';
    //     const url = '/page2';
    //     window.history.pushState(state, pageTitle, url);
    //     expect(document.body.querySelector('first-page')).to.be.null;
    //     expect(document.body.querySelector('second-page')).to.not.be.null;
    //
    // });

    // it('switches to the path that matches the current location after calling replaceState', async() => {
    //     const tpl = document.createElement('template');
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);
    //
    //     window.history.pushState({}, document.title, '/page1');
    //
    //     const state = { my: 'state' };
    //     const pageTitle = 'the title';
    //     const url = '/page2';
    //     window.history.replaceState(state, pageTitle, url);
    //     expect(document.body.querySelector('first-page')).to.be.null;
    //     expect(document.body.querySelector('second-page')).to.not.be.null;
    //
    // });

    // it('updates the document title that matches the current location after calling pushState', async () => {
    //     await fixture(html`
    //         <router-component>
    //             <first-page path="/page1" document-title="Test1"></first-page>
    //             <second-page path="/page2" document-title="Test2"></second-page>
    //         </router-component>
    //     `);
    //     window.history.pushState({}, document.title, '/page1');
    //     expect(document.title).to.equal('Test1');
    //     const state = { my: 'state' };
    //     const pageTitle = 'the title';
    //     const url = '/page2';
    //     window.history.pushState(state, pageTitle, url);
    //     expect(document.title).to.equal('Test2');
    // });

    // it('fires route-changed event when routes are changed', async () => {
    //     const routeChangedSpy = sinon.spy();
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);
    //     component.addEventListener('route-changed', routeChangedSpy);
    //     window.history.pushState({}, document.title, '/page1');
    //     expect(routeChangedSpy.callCount).to.equal(1);
    //     const state = { my: 'state' };
    //     const pageTitle = 'the title';
    //     const url = '/page2';
    //     window.history.pushState(state, pageTitle, url);
    //     expect(routeChangedSpy.callCount).to.equal(2);
    //     expect(routeChangedSpy.callCount).to.equal(2);
    // });

    // it('changes to appropriate routes when nested routes exist', async () => {
    //     const parentRouter: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1"></first-page>
    //             <nested-second-page path="/nested/pages$">
    //                 <router-component>
    //                     <nested-one path="/nested/pages/1"></nested-one>
    //                     <nested-two path="/nested/pages/2"></nested-two>
    //                 </router-component>
    //             </nested-second-page>
    //         </router-component>
    //     `);
    //     window.history.pushState({}, document.title, '/page1'); // ensure we start on first page
    //     window.history.pushState({}, document.title, '/nested/pages');
    //     const childRouter = parentRouter.querySelector('router-component') as RouterComponent;
    //     expect(childRouter.children.length).to.equal(0);
    //     window.history.pushState({}, document.title, '/nested/pages/2');
    //     expect(childRouter.querySelector('nested-two')).to.not.be.null;
    //     parentRouter.remove();
    // });

    // it('only calls on router show once per click', async () => {
    //     const component: RouterComponent = await fixture(html`
    //         <router-component>
    //             <first-page path="/page1">
    //                 <a href="/page2">To page 2</a>
    //             </first-page>
    //             <second-page path="/page2"></second-page>
    //         </router-component>
    //     `);
    //     window.history.pushState({}, document.title, '/page1');
    //     const showSpy = sinon.spy(component, 'show');
    //     const firstPage = document.querySelector('first-page');
    //     expect(showSpy.callCount).to.equal(0);
    //     const firstPageLink = firstPage.querySelector('a');
    //     firstPageLink.click();
    //     expect(showSpy.callCount).to.equal(1);
    // });

    // it('re-renders the route again if requested path matches the pattern of the current route but is a different path', async () => {
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
    //     await fixture(html`
    //         <router-component>
    //             <test-page path="/page[0-9]"></test-page>
    //         </router-component>
    //     `);

    //     window.history.pushState({}, document.title, '/page1');

    //     connectedCallbackSpy.resetHistory();
    //     disconnectedCallbackSpy.resetHistory();
    //     const page = document.body.querySelector('test-page');
    //     expect(page).to.not.be.null;
    //     window.history.pushState({}, document.title, '/page2');
    //     expect(connectedCallbackSpy.callCount).to.equal(1);
    //     expect(disconnectedCallbackSpy.callCount).to.equal(1);
    // });

    // it('re-renders the route again if clicking to a path matches the pattern of the current route', async () => {
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
    //     await fixture(html`
    //         <router-component>
    //             <test-click-page path="/page[0-9]">
    //                 <a href="/page2">To page 2</a>
    //             </test-click-page>
    //         </router-component>
    //     `);

    //     window.history.pushState({}, document.title, '/page1');
    //     const firstPage = document.querySelector('test-click-page');
    //     connectedCallbackSpy.resetHistory();
    //     disconnectedCallbackSpy.resetHistory();
    //     const firstPageLink = firstPage.querySelector('a');
    //     firstPageLink.click();
    //     expect(connectedCallbackSpy.callCount).to.equal(1);
    //     expect(disconnectedCallbackSpy.callCount).to.equal(1);
    // });

    describe('when triggerRouteChange is set to false when pushing new state', async () => {
        let component: RouterComponent;

        beforeEach(async () => {
            component = await fixture(html`
                <router-component>
                    <first-page path="/page1"></first-page>
                    <second-page path="/page2"></second-page>
                </router-component>
            `);
            window.history.pushState({}, document.title, '/page1');
        });

        afterEach(() => {});

        it('should update the window pathname', async () => {
            window.history.pushState({ triggerRouteChange: false }, null, '/page3');
            expect(location.pathname).to.equal('/page3');
        });

        it('should cleanup the triggerRouteChange from the history state', async () => {
            window.history.pushState({ triggerRouteChange: false }, null, '/page3');
            expect(history.state.triggerRouteChange, undefined);
        });

        it('should not call console warning', async () => {
            window.history.pushState({ triggerRouteChange: false }, null, '/page3');
            expect(consoleWarn.callCount).to.equal(0);
        });

        it('should not fire a route change event', async () => {
            const routeChangedSpy = sinon.spy();
            component.addEventListener('route-changed', routeChangedSpy);
            window.history.pushState({ triggerRouteChange: false }, null, '/page3');
            expect(routeChangedSpy.callCount).to.equal(0);
        });

        it('should continue to show current route that was showing before pushState call', async () => {
            window.history.pushState({ triggerRouteChange: false }, null, '/page3');
            expect(consoleWarn.callCount).to.equal(0);
            expect(document.body.querySelector('first-page')).to.not.be.null;
            expect(document.body.querySelector('second-page')).to.be.null;
        });

        it('should not change the route if null is passed as the state', async () => {
            window.history.pushState(null, null, '/page3');
            expect(document.body.querySelector('first-page')).to.not.be.null;
        });
        it('should go back to previous route and continue to show previous page when requested', async () => {
            window.history.pushState({ triggerRouteChange: false }, null, '/page3');
            window.history.pushState({}, null, '/page1');
            expect(location.pathname, '/page1');
            expect(document.body.querySelector('first-page')).to.not.be.null;
        });
    });

    describe('extractPathParams', async () => {
        it('returns the captured groups of the string with the supplied regex', async () => {
            const testPath = 'test';
            const id = '8';
            expect(extractPathParams('([a-z]+)/([0-9])', `${testPath}/${id}`)).to.deep.equal([testPath, id]);
        });
    });
});
