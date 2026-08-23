(function () {
  "use strict";

  /* ---- header scroll state ---- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- mobile nav toggle ---- */
  var toggle = document.querySelector(".nav__toggle");
  if (toggle && header) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });

    document.querySelectorAll(".nav__links .nav__link").forEach(function (link) {
      link.addEventListener("click", function () {
        header.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---- active nav link ---- */
  var here = (window.location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".nav__link[href]").forEach(function (link) {
    var href = link.getAttribute("href");
    if (href === here || (here === "" && href === "index.html")) {
      link.classList.add("is-active");
    }
  });

  /* ---- footer year ---- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---- contact page: prefill service from ?service= ---- */
  var serviceField = document.getElementById("service");
  if (serviceField) {
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get("service");
    if (wanted) {
      Array.prototype.forEach.call(serviceField.options, function (opt) {
        if (opt.value === wanted) {
          opt.selected = true;
        }
      });
    }
  }

  /* ---- contact form submission ---- */
  var form = document.getElementById("contact-form");
  if (form) {
    var statusBox = document.getElementById("form-status");
    var submitBtn = form.querySelector('button[type="submit"]');
    // Remember whatever the button is labelled in the HTML, so renaming it
    // there is enough and this file does not need editing too.
    var submitLabel = submitBtn ? submitBtn.textContent : "";

    var showStatus = function (kind, message) {
      if (!statusBox) return;
      statusBox.textContent = message;
      statusBox.className = "form__status is-visible form__status--" + kind;
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (form.querySelector('[name="website"]').value) {
        return; // honeypot tripped, silently drop
      }

      var required = form.querySelectorAll("[required]");
      var valid = true;
      required.forEach(function (field) {
        if (!field.value.trim()) {
          valid = false;
        }
      });
      if (!valid) {
        showStatus("err", "Please fill in your name, email, and a short message before sending.");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      fetch(form.action, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: new FormData(form),
      })
        .then(function (res) {
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              if (!res.ok || (data && data.ok === false)) {
                throw new Error((data && data.error) || "Request failed");
              }
              return data;
            });
        })
        .then(function () {
          showStatus("ok", "Thanks, your message is on its way. I'll be in touch within one business day.");
          form.reset();
        })
        .catch(function (err) {
          showStatus(
            "err",
            err && err.message && err.message !== "Request failed"
              ? err.message
              : "Something went wrong sending that. Please try again, or email me directly at the address below."
          );
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitLabel;
          }
        });
    });
  }
})();
