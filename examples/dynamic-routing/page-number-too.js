import { extractPathParams } from '../../dist/router-component.js';
customElements.define(
    'page-number-too',
    class extends HTMLElement {
        connectedCallback() {
            const url = new URL(window.location);
            const pathPattern = this.getAttribute('path');
            const [id, username] = extractPathParams(pathPattern, url.href);
            this.innerHTML = `
            <p>
                You've arrived at the <strong>${window.location.pathname}</strong> page with 
                ID set to <strong>${id}</strong> and username set to 
                <strong>${username}</strong>.
            </p>
            <p>
                Click <a href="my/page/3/">my/page/3</a> to go to page three.
            </p>
        `;
        }
    }
);
