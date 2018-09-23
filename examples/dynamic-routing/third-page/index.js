customElements.define('third-page', class extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <p>You've arrived at <strong>${window.location.pathname}</strong>.</p>
            <p>
                Click <a href="nested/page">nested/page</a> to go to the nested fourth page.
            </p>
        `;
    }
});