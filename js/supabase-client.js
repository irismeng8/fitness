// Supabase Client Initialization
// Project URL: https://bswjzngmckyrvanbhaqk.supabase.co

(function () {
    const SUPABASE_URL = 'https://bswjzngmckyrvanbhaqk.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_vy85JBE8MFVa6sEoTKQSOg_2fgke17H';

    // Wait for the supabase global from CDN to be ready
    function initClient() {
        if (window.supabase && window.supabase.createClient) {
            window._sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } else if (window.supabaseJs) {
            window._sb = window.supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            // SDK not yet loaded — retry
            setTimeout(initClient, 50);
            return;
        }
        // Dispatch ready event so pages can react
        document.dispatchEvent(new Event('supabase-ready'));
    }

    // Auth helpers exposed globally
    window.AuthUtils = {
        // Get currently logged-in user (null if not logged in)
        getUser: async () => {
            const { data: { session } } = await window._sb.auth.getSession();
            return session ? session.user : null;
        },

        // Redirect to login if not authenticated
        requireAuth: async () => {
            const user = await window.AuthUtils.getUser();
            if (!user) {
                window.location.href = 'login.html';
                return null;
            }
            return user;
        },

        // Sign out and redirect
        signOut: async () => {
            await window._sb.auth.signOut();
            window.location.href = 'login.html';
        },

        // Get display name from email (part before @)
        getDisplayName: (user) => {
            if (!user) return '';
            return user.email ? user.email.split('@')[0] : user.id.slice(0, 8);
        }
    };

    initClient();
})();
