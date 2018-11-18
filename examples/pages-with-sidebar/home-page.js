customElements.define(
    'home-page',
    class extends HTMLElement {
        connectedCallback() {
            this.innerHTML = `Here is my home page at <strong>${window.location.pathname}</strong>.`;
        }
    }
);
