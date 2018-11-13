customElements.define(
    'home-page',
    class extends HTMLElement {
        connectedCallback() {
            this.innerHTML = `
            <p>Welcome to the home page!</p>
            <p>To start, navigate to <a href="/page1?foo=bar">the first page</a>.</p>
        `;
        }
    }
);
