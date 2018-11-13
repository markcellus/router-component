customElements.define(
    'the-sidebar',
    class extends HTMLElement {
        connectedCallback() {
            this.innerHTML = `
            <strong>Sidebar</strong>
            <p>Click on an item below to go to a specific page</p>
            
            <a href="">Home Page</a>
            <a href="page/2">Second Page</a>
        `;
        }
    }
);
