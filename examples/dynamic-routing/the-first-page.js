customElements.define('the-first-page', class extends HTMLElement {
    connectedCallback() {
        const url = new URL(window.location);
        const paramValue = url.searchParams.get('foo');
        this.innerHTML = `
            <p>You passed <strong>${paramValue}</strong> as the foo query param.</p>
            <p>Go to <a href="/second/page/851/johnDoe/">/second/page/851/johnDoe/</a></p>
        `;
    }
});