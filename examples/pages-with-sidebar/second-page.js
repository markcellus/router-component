customElements.define('second-page', class extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `Here is my second page at <strong>${window.location.pathname}</strong>.`;
    }
});
