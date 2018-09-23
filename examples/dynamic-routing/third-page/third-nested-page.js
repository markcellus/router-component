customElements.define('third-nested-page', class extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <p>You've arrived at the last page <strong>${window.location.pathname}</strong>. 
            Feel free to click the back button.</p>
        `;
    }
});