(function (global) {
    'use strict';

    var API = 'api/auth.php';
    var FAV_API = 'api/favorites.php';
    var LS_ACCOUNT = 'ayPlayer_account';
    var LS_FAV_TIME = 'ayPlayer_fav_sync_time';

    var currentNick = null;
    var pendingFavs = null;
    var pendingSettings = null;

    // ------------------------------------------------------------------ //
    // Local helpers
    // ------------------------------------------------------------------ //

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function postForm(action, data, useSession) {
        var form = new URLSearchParams();
        Object.keys(data).forEach(function (k) { form.append(k, data[k]); });
        var opts = { method: 'POST', body: form };
        if (useSession) opts.credentials = 'same-origin';
        return fetch(API + '?action=' + action, opts).then(function (r) {
            return r.json().then(function (j) {
                if (!r.ok && j && !j.ok) {
                    var e = new Error((j && j.error) || ('HTTP ' + r.status));
                    e.json = j;
                    throw e;
                }
                return j;
            });
        });
    }

    function getMe() {
        return fetch(API + '?action=me', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); });
    }

    function getAccountData() {
        return fetch(FAV_API, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); });
    }

    function initMenuAndModals() {
        var bar = document.getElementById('siteMenu');
        if (!bar) return;
        var nickItem = document.getElementById('menuNick');
        var logoutItem = document.getElementById('menuLogout');
        var loginItem = document.getElementById('menuLogin');
        if (currentNick) {
            if (nickItem) {
                nickItem.textContent = currentNick;
                nickItem.style.display = '';
            }
            if (logoutItem) logoutItem.style.display = '';
            if (loginItem) loginItem.style.display = 'none';
        } else {
            if (nickItem) nickItem.style.display = 'none';
            if (logoutItem) logoutItem.style.display = 'none';
            if (loginItem) loginItem.style.display = '';
        }
    }

    function showModal(id) {
        var m = document.getElementById(id);
        if (m) m.style.display = '';
    }

    function hideModal(id) {
        var m = document.getElementById(id);
        if (m) m.style.display = 'none';
    }

    function bindModalDismiss(id, closeBtnId) {
        var m = document.getElementById(id);
        if (!m) return;
        if (closeBtnId) {
            var b = document.getElementById(closeBtnId);
            if (b) b.addEventListener('click', function () { hideModal(id); });
        }
        m.addEventListener('click', function (e) {
            if (e.target === m) hideModal(id);
        });
    }

    function setError(el, msg) {
        var box = document.getElementById(el);
        if (box) {
            box.textContent = msg || '';
            box.style.display = msg ? '' : 'none';
        }
    }

    function showInfo(html) {
        var m = document.getElementById('authModal_infoBox');
        if (m) { m.innerHTML = html; m.style.display = ''; }
    }

    // ------------------------------------------------------------------ //
    // Auth actions
    // ------------------------------------------------------------------ //

    function doRegister(form) {
        var nick = form.nick.value.trim();
        var pass = form.password.value;
        var confirm = form.password2 ? form.password2.value : '';
        if (confirm !== pass) { setError('authModal_error', 'Password and confirmation do not match'); return; }
        setError('authModal_error', '');
        form.submitBtn.disabled = true;
        postForm('register', { nick: nick, password: pass }, true)
            .then(function () {
                afterLogin(nick);
            })
            .catch(function (err) {
                setError('authModal_error', err.message && err.json && err.json.error ? err.json.error : 'Registration failed. Try again.');
            })
            .finally(function () { if (form.submitBtn) form.submitBtn.disabled = false; });
    }

    function doLogin(form) {
        var nick = form.nick.value.trim();
        var pass = form.password.value;
        var remember = !!(form.remember && form.remember.checked);
        setError('authModal_error', '');
        form.submitBtn.disabled = true;
        postForm('login', { nick: nick, password: pass, remember: remember ? '1' : '0' }, true)
            .then(function () {
                afterLogin(nick);
            })
            .catch(function (err) {
                setError('authModal_error', err.message && err.json && err.json.error ? err.json.error : 'Login failed. Try again.');
            })
            .finally(function () { if (form.submitBtn) form.submitBtn.disabled = false; });
    }

    function afterLogin(nick) {
        currentNick = nick;
        try { localStorage.setItem(LS_ACCOUNT, nick); } catch (e) {}
        // Account favorites/settings are authoritative. Local (guest) state is
        // replaced on auth, never merged, so a fresh account starts empty.
        getAccountData().then(function (d) {
            if (d && d.ok) {
                var accFavs = d.favs || [];
                var accSettings = d.settings || {};
                if (global.AYPlayer && global.AYPlayer.applyAccount) {
                    global.AYPlayer.applyAccount(accFavs, accSettings);
                }
                pendingFavs = null;
                pendingSettings = null;
            }
        }).catch(function () {});
        initMenuAndModals();
        hideModal('authModal');
    }

    function doLogout() {
        postForm('logout', {}, true)
            .then(function () {
                currentNick = null;
                try { localStorage.removeItem(LS_ACCOUNT); } catch (e) {}
                if (global.AYPlayer && global.AYPlayer.onLogout) global.AYPlayer.onLogout();
                initMenuAndModals();
            })
            .catch(function () {
                currentNick = null;
                try { localStorage.removeItem(LS_ACCOUNT); } catch (e) {}
                if (global.AYPlayer && global.AYPlayer.onLogout) global.AYPlayer.onLogout();
                initMenuAndModals();
            });
    }

    // Called at boot: check if a saved session exists.
    function restoreSession() {
        var saved = null;
        try { saved = localStorage.getItem(LS_ACCOUNT); } catch (e) {}
        getMe().then(function (d) {
            if (d && d.ok && d.authed) {
                afterLogin(d.nick);
            } else {
                if (saved) { try { localStorage.removeItem(LS_ACCOUNT); } catch (e) {} }
                initMenuAndModals();
            }
        }).catch(function () {
            initMenuAndModals();
        });
    }

    // ------------------------------------------------------------------ //
    // Sync API (used by AYPlayer)
    // ------------------------------------------------------------------ //

    function syncFavorites(favsObject) {
        if (!currentNick) return Promise.resolve();
        var list = Object.keys(favsObject || {});
        pendingFavs = list;
        if (pendingSettings === null) return pushPending();
        return pushPending();
    }

    function syncSettings(settings) {
        if (!currentNick) return Promise.resolve();
        pendingSettings = settings || {};
        if (pendingFavs === null) return pushPending();
        return pushPending();
    }

    function pushPending() {
        if (!currentNick) return Promise.resolve();
        var body = {};
        if (pendingFavs !== null) body.favs = pendingFavs;
        if (pendingSettings !== null) body.settings = pendingSettings;
        var sentFavs = pendingFavs;
        var sentSettings = pendingSettings;
        return fetch(FAV_API, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (r) {
            if (!r.ok) throw new Error('sync failed ' + r.status);
            // keep pending until server confirms; on success these are "clean"
            if (sentFavs !== null) pendingFavs = null;
            if (sentSettings !== null) pendingSettings = null;
            return r.json();
        }).catch(function () {
            // network/offline: keep pending, retry on next action
        });
    }

    function isLoggedIn() { return !!currentNick; }
    function getNick() { return currentNick; }

    // ------------------------------------------------------------------ //
    // Wiring
    // ------------------------------------------------------------------ //

    function wireEvents() {
        var loginBtn = document.getElementById('menuLogin');
        if (loginBtn) loginBtn.addEventListener('click', function () {
            var tabLogin = document.getElementById('authTabLogin');
            var tabReg = document.getElementById('authTabRegister');
            var panelLogin = document.getElementById('authPanelLogin');
            var panelReg = document.getElementById('authPanelRegister');
            if (currentNick) return;
            if (tabLogin && panelLogin && panelReg) {
                tabLogin.classList.add('active');
                tabReg.classList.remove('active');
                panelLogin.style.display = '';
                panelReg.style.display = 'none';
            }
            setError('authModal_error', '');
            showModal('authModal');
            var i = document.getElementById('authLoginNick');
            if (i) { i.focus(); }
        });

        var logoutBtn = document.getElementById('menuLogout');
        if (logoutBtn) logoutBtn.addEventListener('click', function () { doLogout(); });

        var regBtn = document.getElementById('authDoRegister');
        if (regBtn) regBtn.addEventListener('click', function () {
            doRegister(regBtn.form);
        });

        var loginSubmit = document.getElementById('authDoLogin');
        if (loginSubmit) loginSubmit.addEventListener('click', function () {
            doLogin(loginSubmit.form);
        });

        var aboutBtn = document.getElementById('menuAbout');
        if (aboutBtn) aboutBtn.addEventListener('click', function () { showModal('aboutModal'); });
        var helpBtn = document.getElementById('menuHelp');
        if (helpBtn) helpBtn.addEventListener('click', function () { showModal('helpModal'); });

        bindModalDismiss('authModal', 'authModal_close');
        bindModalDismiss('aboutModal', 'aboutModal_close');
        bindModalDismiss('helpModal', 'helpModal_close');

        var tabLogin = document.getElementById('authTabLogin');
        var tabReg = document.getElementById('authTabRegister');
        var panelLogin = document.getElementById('authPanelLogin');
        var panelReg = document.getElementById('authPanelRegister');
        if (tabLogin) tabLogin.addEventListener('click', function () {
            tabLogin.classList.add('active'); tabReg.classList.remove('active');
            panelLogin.style.display = ''; panelReg.style.display = 'none';
            setError('authModal_error', '');
        });
        if (tabReg) tabReg.addEventListener('click', function () {
            tabReg.classList.add('active'); tabLogin.classList.remove('active');
            panelReg.style.display = ''; panelLogin.style.display = 'none';
            setError('authModal_error', '');
        });
    }

    // ------------------------------------------------------------------ //

    function init() {
        initMenuAndModals();
        wireEvents();
        restoreSession();
    }

    global.AYPlayAuthUI = {
        init: init,
        isLoggedIn: isLoggedIn,
        getNick: getNick,
        syncFavorites: syncFavorites,
        syncSettings: syncSettings,
        pushPending: pushPending,
        afterLogin: afterLogin
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-render menu after player injected (player may run after us).
    if (window.AYPlayer && window.AYPlayer.init) {
        var origInit = window.AYPlayer.init;
        // We hook init so the menu is refreshed when the player is (re)built.
        window.AYPlayer.init = function (el, opts) {
            var r = origInit.call(this, el, opts);
            initMenuAndModals();
            return r;
        };
    }

})(window);