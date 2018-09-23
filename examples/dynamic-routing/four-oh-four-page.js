customElements.define('four-oh-four-page', class extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `<p>Wrong page, go to <a href="/">home page</a></p>`;
    }
});