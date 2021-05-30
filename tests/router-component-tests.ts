import sinon from 'sinon';
import { expect, fixture, html, nextFrame } from '@open-wc/testing';
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

    it('removes all children from the dom when instantiated if none match the current route', async () => {
        await fixture(html`
            <router-component>
                <first-page path="/page1"></first-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/');
        expect(document.body.querySelector('first-page')).to.be.null;
    });

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
                <first-page
                    path="page1"
                    search-params="foo=[bar|baz]"
                ></first-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/page1?foo=baz');
        expect(document.body.querySelector('first-page')).to.not.be.null;
    });

    it('shows only the child that has a path that matches the current location', async () => {
        const component: RouterComponent = await fixture(html`
            <router-component>
                <first-page path="/page1"></first-page>
                <second-page path="/page2"></second-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/page1');
        const firstPage = document.body.querySelector('first-page');
        expect(firstPage.parentElement).to.deep.equal(component);
        expect(document.body.querySelector('second-page')).to.be.null;
    });

    it('shows the child whose path matches the catch all url', async () => {
        await fixture(html`
            <router-component>
                <first-page path="/test/*"></first-page>
                <second-page path="/*"></second-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/page1');
        expect(document.body.querySelector('first-page')).to.be.null;
        expect(document.body.querySelector('second-page')).to.not.be.null;
    });

    it('should continue to show the current page and not show a warning when show has been called with the same url', async () => {
        const component: RouterComponent = await fixture(html`
            <router-component>
                <first-page path="/page1"></first-page>
                <second-page path="/page2"></second-page>
            </router-component>
        `);

        const pathname = '/page1';
        window.history.pushState({}, document.title, pathname);
        consoleWarn.resetHistory();
        component.show(pathname);
        expect(consoleWarn.callCount).to.equal(0);
        expect(document.body.querySelector('first-page')).to.not.be.null;
        expect(document.body.querySelector('second-page')).to.be.null;
    });

    it('shows first route that matches the current page even if other routes match', async () => {
        const component: RouterComponent = await fixture(html`
            <router-component>
                <first-page path="/page/*"></first-page>
                <second-page path="/page/2"></second-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/page');
        // showing first page
        component.show('/page/2');
        expect(document.body.querySelector('first-page')).to.not.be.null;
        expect(document.body.querySelector('second-page')).to.be.null;
    });

    it('switches to the child that has the path that matches the current location after link has been clicked', async () => {
        await fixture(html`
            <router-component>
                <first-page path="/page1">
                    <a href="/page2">To page 2</a>
                </first-page>
                <second-page path="/page2"></second-page>
            </router-component>
        `);

        window.history.pushState({}, document.title, '/page1');
        const firstPageLink = document.querySelector(
            'first-page a'
        ) as HTMLAnchorElement;
        firstPageLink.click();
        expect(document.body.querySelector('first-page')).to.be.null;
        expect(document.body.querySelector('second-page')).to.not.be.null;
    });

    it('switches to the / route if clicking a link that has / as its pathname', async () => {
        await fixture(html`
            <router-component>
                <first-page path="/page1">
                    <a href="/">To home</a>
                </first-page>
                <home-page path="/"></home-page>
            </router-component>
        `);

        window.history.pushState({}, document.title, '/page1');
        const firstPageLink = document.querySelector(
            'first-page a'
        ) as HTMLAnchorElement;
        firstPageLink.click();
        expect(document.body.querySelector('first-page')).to.be.null;
        expect(document.body.querySelector('home-page')).to.not.be.null;
    });

    it('switches to the catch all route that has the path that matches the current location after link has been clicked', async () => {
        await fixture(html`
            <router-component>
                <first-page path="/page1">
                    <a href="/">To fallback page</a>
                </first-page>
                <fallback-page path=".*"></fallback-page>
            </router-component>
        `);

        window.history.pushState({}, document.title, '/page1');
        const firstPageLink = document.querySelector(
            'first-page a'
        ) as HTMLAnchorElement;
        firstPageLink.click();
        expect(document.body.querySelector('first-page')).to.be.null;
        expect(document.body.querySelector('fallback-page')).to.not.be.null;
    });

    it('continues to show current page when clicking a link with a non-relative href', async () => {
        await fixture(html`
            <router-component>
                <first-page path="/page1">
                    <a href="http://test.com/blah">To page 2</a>
                </first-page>
                <second-page path="/page2"></second-page>
            </router-component>
        `);

        window.history.pushState({}, document.title, '/page1');

        const firstPageLink = document.querySelector('first-page a');
        const evt = new Event('click');
        evt.preventDefault();
        firstPageLink.dispatchEvent(evt);
        expect(document.body.querySelector('first-page')).to.not.be.null;
        expect(document.body.querySelector('second-page')).to.be.null;
    });

    it('switches to the path that matches the current location after calling pushState', async () => {
        await fixture(html`
            <router-component>
                <first-page path="/page1"></first-page>
                <second-page path="/page2"></second-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/page1');
        const state = { my: 'state' };
        const pageTitle = 'the title';
        const url = '/page2';
        window.history.pushState(state, pageTitle, url);
        expect(document.body.querySelector('first-page')).to.be.null;
        expect(document.body.querySelector('second-page')).to.not.be.null;
    });

    it('switches to the path that matches the current location after calling replaceState', async () => {
        await fixture(html`
            <router-component>
                <first-page path="/page1"></first-page>
                <second-page path="/page2"></second-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/page1');
        const state = { my: 'state' };
        const pageTitle = 'the title';
        const url = '/page2';
        window.history.replaceState(state, pageTitle, url);
        expect(document.body.querySelector('first-page')).to.be.null;
        expect(document.body.querySelector('second-page')).to.not.be.null;
    });

    it('updates the document title that matches the current location after calling pushState', async () => {
        await fixture(html`
            <router-component>
                <first-page path="/page1" document-title="Test1"></first-page>
                <second-page path="/page2" document-title="Test2"></second-page>
            </router-component>
        `);
        window.history.pushState({}, document.title, '/page1');
        expect(document.title).to.equal('Test1');
        const state = { my: 'state' };
        const pageTitle = 'the title';
        const url = '/page2';
        window.history.pushState(state, pageTitle, url);
        expect(document.title).to.equal('Test2');
    });

    it('fires route-changed event when routes are changed', async () => {
        const routeChangedSpy = sinon.spy();
        const component: RouterComponent = await fixture(html`
            <router-component>
                <first-page path="/page1"></first-page>
                <second-page path="/page2"></second-page>
            </router-component>
        `);
        component.addEventListener('route-changed', routeChangedSpy);
        window.history.pushState({}, document.title, '/page1');
        expect(routeChangedSpy.callCount).to.equal(1);
        const state = { my: 'state' };
        const pageTitle = 'the title';
        const url = '/page2';
        window.history.pushState(state, pageTitle, url);
        expect(routeChangedSpy.callCount).to.equal(2);
        expect(routeChangedSpy.callCount).to.equal(2);
    });

    it('re-renders route node and connectedCallback/disconnectedCallback if requested path matches the pattern of the current route but is a different path', async () => {
        const connectedCallbackSpy = sinon.spy();
        const disconnectedCallbackSpy = sinon.spy();
        customElements.define(
            'test-page',
            class extends HTMLElement {
                connectedCallback() {
                    connectedCallbackSpy();
                }
                disconnectedCallback() {
                    disconnectedCallbackSpy();
                }
            }
        );
        await fixture(html`
            <router-component>
                <test-page path="/page[0-9]"></test-page>
            </router-component>
        `);

        window.history.pushState({}, document.title, '/page1');

        connectedCallbackSpy.resetHistory();
        disconnectedCallbackSpy.resetHistory();
        const page = document.body.querySelector('test-page');
        expect(page).to.not.be.null;
        window.history.pushState({}, document.title, '/page2');
        expect(connectedCallbackSpy.callCount).to.equal(1);
        expect(disconnectedCallbackSpy.callCount).to.equal(1);
    });

    it('connectedCallback and disconnectedCallback are triggered again when clicking to a path that matches the pattern of the current route', async () => {
        const connectedCallbackSpy = sinon.spy();
        const disconnectedCallbackSpy = sinon.spy();
        customElements.define(
            'test-click-page',
            class extends HTMLElement {
                connectedCallback() {
                    connectedCallbackSpy();
                }
                disconnectedCallback() {
                    disconnectedCallbackSpy();
                }
            }
        );
        await fixture(html`
            <router-component>
                <test-click-page path="/page[0-9]">
                    <a href="/page2">To page 2</a>
                </test-click-page>
            </router-component>
        `);

        window.history.pushState({}, document.title, '/page1');
        connectedCallbackSpy.resetHistory();
        disconnectedCallbackSpy.resetHistory();
        const firstPageLink =
            document.querySelector<HTMLAnchorElement>('test-click-page a');
        firstPageLink.click();
        expect(connectedCallbackSpy.callCount).to.equal(1);
        expect(disconnectedCallbackSpy.callCount).to.equal(1);
    });

    describe('when popstate is triggered', () => {
        it('switches to the child that has the path that matches the current location', async () => {
            await fixture(html`
                <router-component>
                    <first-page path="/page1"></first-page>
                    <second-page path="/page2"></second-page>
                </router-component>
            `);

            window.history.pushState({}, document.title, '/page1');
            window.history.pushState({}, document.title, '/page2');
            const popstate = new PopStateEvent('popstate', { state: {} });
            window.dispatchEvent(popstate);
            expect(document.body.querySelector('first-page')).to.be.null;
            expect(document.body.querySelector('second-page')).to.not.be.null;
        });

        it('shows a warning when attempting to go to a route that is not handled', async () => {
            const component: RouterComponent = await fixture(html`
                <router-component>
                    <first-page path="/page1"></first-page>
                    <second-page path="/page2"></second-page>
                </router-component>
            `);

            window.history.pushState({}, document.title, '/page1');
            const newPath = 'nope';
            consoleWarn.resetHistory();
            component.show(newPath);
            expect(consoleWarn.args[0]).to.deep.equal([
                `Navigated to path "${newPath}" but there is no matching ` +
                    `element with a path that matches. Maybe you should implement a catch-all route with the path attribute of ".*"?`,
            ]);
        });

        it('removes previous route element after clicking back button', async () => {
            await fixture(html`
                <router-component>
                    <first-page path="/page1">
                        <a href="/page2">To page 2</a>
                    </first-page>
                    <second-page path="/page2"></second-page>
                </router-component>
            `);

            window.history.pushState({}, document.title, '/page1');
            const firstPageLink: HTMLAnchorElement =
                document.querySelector('first-page a');
            firstPageLink.click(); // go to second
            window.history.back();
            await nextFrame();
            expect(document.body.querySelector('first-page')).to.not.be.null;
            expect(document.body.querySelector('second-page')).to.be.null;
        });
    });

    describe('when pushState or replaceState is overridden', () => {
        const origPushState = window.history.pushState;
        const origReplaceState = window.history.replaceState;
        afterEach(() => {
            window.history.pushState = origPushState;
            window.history.replaceState = origReplaceState;
        });
        it('renders the route when clicking to a path while pushState is anonymously overridden', async () => {
            const customPushStateSpy = sinon.spy();
            window.history.pushState = customPushStateSpy;
            const router = await fixture(html`
                <router-component>
                    <first-page path="/page1">
                        <a href="/page2">To page 2</a>
                    </first-page>
                    <second-page path="/page2"></second-page>
                </router-component>
            `);
            window.history.pushState({}, document.title, '/page1');
            customPushStateSpy.resetHistory();
            const firstPageLink: HTMLAnchorElement =
                document.querySelector('first-page a');
            firstPageLink.click();
            expect(document.querySelector('second-page')).not.to.be.null;
            expect(customPushStateSpy.callCount).to.equal(1);
            router.remove(); // must remove router to reset pushState/replaceState overrides
        });

        it('renders the route when clicking to a path while replaceState is anonymously overridden', async () => {
            const customReplaceStateSpy = sinon.spy();
            window.history.replaceState = customReplaceStateSpy;
            const router = await fixture(html`
                <router-component>
                    <first-page path="/page1">
                        <a href="/page2">To page 2</a>
                    </first-page>
                    <second-page path="/page2"></second-page>
                </router-component>
            `);
            window.history.pushState({}, document.title, '/page1');
            customReplaceStateSpy.resetHistory();
            window.history.replaceState({}, document.title, '/page2');
            expect(document.querySelector('second-page')).not.to.be.null;
            expect(customReplaceStateSpy.callCount).to.equal(1);
            router.remove(); // must remove router to reset pushState/replaceState overrides
        });
    });

    describe('when dealing with hash changes', () => {
        let router: RouterComponent;
        beforeEach(async () => {
            router = await fixture(html`
                <router-component>
                    <first-page path="/page[0-9]">
                        <div id="test"></div>
                        <a href="#test">To section</a>
                    </first-page>
                </router-component>
            `);
        });
        it('adds the hash to the the window.location.href when clicking a link that contains only a hash', async () => {
            window.history.pushState({}, document.title, '/page1');
            const page = router.querySelector('first-page');
            const pageLink = page.querySelector('a');
            pageLink.click();
            expect(window.location.href).to.equal(pageLink.href);
        });

        it('scrolls to the element on the route that matches the id of the hash after popstate has been called', async () => {
            window.history.pushState({}, document.title, '/page1#test');
            const hashedElement = router.querySelector(
                'first-page div[id="test"]'
            );
            const popstate = new PopStateEvent('popstate', { state: {} });
            const scrollIntoViewStub = sinon.spy(
                hashedElement,
                'scrollIntoView'
            );
            window.dispatchEvent(popstate);
            expect(scrollIntoViewStub).to.be.calledOnceWithExactly({
                behavior: 'auto',
            });
        });

        it('scrolls back to top of page if there is no hash', async () => {
            window.history.pushState({}, document.title, '/page1');
            const popstate = new PopStateEvent('popstate', { state: {} });
            const windowScrollToStub = sinon.stub(window, 'scrollTo');
            window.dispatchEvent(popstate);
            expect(windowScrollToStub).to.be.calledOnceWithExactly({
                behavior: 'auto',
                top: 0,
            });
            windowScrollToStub.restore();
        });
    });

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
            consoleWarn.resetHistory();
        });

        it('updates the window pathname', async () => {
            window.history.pushState(
                { triggerRouteChange: false },
                null,
                '/page2'
            );
            expect(location.pathname).to.equal('/page2');
        });

        it('cleans up the triggerRouteChange from the history state', async () => {
            window.history.pushState(
                { triggerRouteChange: false },
                null,
                '/page2'
            );
            expect(history.state.triggerRouteChange, undefined);
        });

        it('does not call console warning', async () => {
            window.history.pushState(
                { triggerRouteChange: false },
                null,
                '/page2'
            );
            expect(consoleWarn.callCount).to.equal(0);
        });

        it('does not fire a route change event', async () => {
            const routeChangedSpy = sinon.spy();
            component.addEventListener('route-changed', routeChangedSpy);
            window.history.pushState(
                { triggerRouteChange: false },
                null,
                '/page2'
            );
            expect(routeChangedSpy.callCount).to.equal(0);
        });

        it('continues to show current route that was showing before pushState call', async () => {
            window.history.pushState(
                { triggerRouteChange: false },
                null,
                '/page2'
            );
            expect(consoleWarn.callCount).to.equal(0);
            expect(document.body.querySelector('first-page')).to.not.be.null;
            expect(document.body.querySelector('second-page')).to.be.null;
        });

        it('goes back to previous route and continue to show previous page when requested', async () => {
            window.history.pushState(
                { triggerRouteChange: false },
                null,
                '/page2'
            );
            window.history.pushState({}, null, '/page1');
            expect(location.pathname, '/page1');
            expect(document.body.querySelector('first-page')).to.not.be.null;
        });
    });

    describe('nested routes', () => {
        it('changes to appropriate routes when nested routes exist', async () => {
            const parentRouter: RouterComponent = await fixture(html`
                <router-component>
                    <first-page path="/page1"></first-page>
                    <nested-second-page path="/nested/pages$">
                        <router-component>
                            <nested-one path="/nested/pages/1"></nested-one>
                            <nested-two path="/nested/pages/2"></nested-two>
                        </router-component>
                    </nested-second-page>
                </router-component>
            `);
            window.history.pushState({}, document.title, '/page1'); // ensure we start on first page
            window.history.pushState({}, document.title, '/nested/pages');
            const childRouter = parentRouter.querySelector(
                'router-component'
            ) as RouterComponent;
            expect(childRouter.children.length).to.equal(0);
            window.history.pushState({}, document.title, '/nested/pages/2');
            expect(childRouter.querySelector('nested-two')).to.not.be.null;
            childRouter.remove();
            parentRouter.remove();
        });
    });

    describe('extractPathParams', async () => {
        it('returns the captured groups of the string with the supplied regex', async () => {
            const testPath = 'test';
            const id = '8';
            expect(
                extractPathParams('([a-z]+)/([0-9])', `${testPath}/${id}`)
            ).to.deep.equal([testPath, id]);
        });
    });
});
