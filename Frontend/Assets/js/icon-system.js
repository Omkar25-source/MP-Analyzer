/**
 * icon-system.js
 * Centralized Lucide icon renderer for consistent sizing/alignment.
 */
(function () {
    'use strict';

    const DEFAULT_ATTRS = {
        'stroke-width': 2,
        width: 18,
        height: 18,
    };

    function create(container) {
        if (typeof lucide === 'undefined' || typeof lucide.createIcons !== 'function') {
            return;
        }

        const attrs = { ...DEFAULT_ATTRS };
        if (container && container.nodeType === 1) {
            lucide.createIcons({ attrs, nameAttr: 'data-lucide' });
            return;
        }

        lucide.createIcons({ attrs, nameAttr: 'data-lucide' });
    }

    window.IconSystem = {
        render(container) {
            if (!container) {
                create(document);
                return;
            }

            create(container);
        },
    };
})();
