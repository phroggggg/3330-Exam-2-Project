/* AnimeKiroku client-side enhancements.
   Everything here is progressive: the site works without JavaScript. */
(function () {
    "use strict";

    /* ---------- Toast feedback ---------- */
    function showToast(message, type) {
        var toast = document.createElement("div");
        toast.className = "toast toast-" + (type || "info");
        toast.setAttribute("role", "status");
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.remove();
        }, 3500);
    }

    /* ---------- Confirm destructive actions ---------- */
    document.addEventListener("submit", function (event) {
        var message = event.target.getAttribute("data-confirm");
        if (message && !window.confirm(message)) event.preventDefault();
    });

    /* ---------- Inline form validation ---------- */
    function messageFor(field) {
        var v = field.validity;
        if (v.valueMissing) return "This field is required.";
        if (v.typeMismatch) return "Please enter a valid value.";
        if (v.tooShort) return "Use at least " + field.minLength + " characters.";
        if (v.patternMismatch) return field.title || "That format is not allowed.";
        if (v.rangeUnderflow) return "Must be at least " + field.min + ".";
        if (v.rangeOverflow) return "Must be at most " + field.max + ".";
        if (v.stepMismatch || v.badInput) return "Enter a whole number.";
        return field.validationMessage;
    }

    function setFieldError(form, field, message) {
        var slot = form.querySelector('[data-error-for="' + field.name + '"]');
        field.classList.toggle("invalid", Boolean(message));
        if (slot) slot.textContent = message || "";
    }

    function validateForm(form) {
        var firstInvalid = null;
        Array.prototype.forEach.call(form.elements, function (field) {
            if (!field.name || field.type === "hidden" || field.type === "submit") return;
            var message = field.checkValidity() ? "" : messageFor(field);
            if (!message && field.name === "confirmPassword") {
                var pw = form.elements.password;
                if (pw && pw.value !== field.value) message = "Passwords do not match.";
            }
            setFieldError(form, field, message);
            if (message && !firstInvalid) firstInvalid = field;
        });
        return firstInvalid;
    }

    Array.prototype.forEach.call(document.querySelectorAll("form[data-validate]"), function (form) {
        form.addEventListener("submit", function (event) {
            var firstInvalid = validateForm(form);
            if (firstInvalid) {
                event.preventDefault();
                firstInvalid.focus();
            }
        });
        form.addEventListener("input", function (event) {
            if (event.target.classList.contains("invalid")) setFieldError(form, event.target, "");
        });
    });

    /* ---------- "+1 ep" without a page reload ---------- */
    async function incrementEpisode(form) {
        var row = form.closest("tr[data-entry-id]");
        var button = form.querySelector("button");
        var csrf = form.querySelector('input[name="_csrf"]').value;
        var episodes = Number(form.querySelector('input[name="episodesWatched"]').value);
        button.disabled = true;

        try {
            var response = await fetch("/api/watchlist/" + row.getAttribute("data-entry-id"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf, Accept: "application/json" },
                body: JSON.stringify({ episodesWatched: episodes }),
            });
            var data = await response.json().catch(function () {
                return {};
            });
            if (!response.ok) throw new Error(data.message || "Could not update your progress.");
            data = data.data; // API replies { success, data }

            row.querySelector(".js-progress").value = data.episodesWatched;
            row.querySelector(".js-episodes").textContent = data.episodesWatched;
            var badge = row.querySelector(".js-status");
            badge.textContent = data.status;
            badge.classList.toggle("badge-ok", data.status === "Completed");
            row.querySelector('select[name="status"]').value = data.status;
            row.querySelector('input[name="episodesWatched"]').value = data.episodesWatched;

            if (data.episodesWatched >= data.totalEpisodes) {
                form.remove();
            } else {
                form.querySelector('input[name="episodesWatched"]').value = data.episodesWatched + 1;
            }
            showToast(data.status === "Completed" ? "Finished! Marked as completed." : "Progress saved.", "success");
        } catch (err) {
            // Network failure or server-side validation error.
            showToast(err.message || "Network error. Please try again.", "error");
        } finally {
            if (document.body.contains(button)) button.disabled = false;
        }
    }

    Array.prototype.forEach.call(document.querySelectorAll("form.js-increment"), function (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            incrementEpisode(form);
        });
    });
})();
