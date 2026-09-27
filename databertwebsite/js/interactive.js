/*
 * Databert interactive layer (homepage).
 *
 * Plain JavaScript, no libraries, no network calls. Everything here runs in
 * the visitor's browser: nothing typed into the health check or calculator is
 * stored or sent anywhere. Each feature looks for its own markup and quietly
 * does nothing if that markup is absent, so this file is safe to load on any
 * page. It respects prefers-reduced-motion throughout.
 */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;

  // If css/interactive.css did not load, enhance nothing: the page stays on
  // its static design rather than showing half styled pieces.
  var probe = doc.querySelector(".scroll-progress");
  if (probe && window.getComputedStyle(probe).position !== "fixed") {
    root.classList.remove("js");
    root.classList.add("no-js");
    return;
  }
  // Tell the safety net in the page head that this script is running.
  root.classList.remove("no-js");
  root.classList.add("js", "ix");

  // Sections that only work with this script are hidden in the HTML and
  // switched on here, so they can never appear half working.
  Array.prototype.forEach.call(doc.querySelectorAll("[data-needs-js]"), function (el) {
    el.hidden = false;
  });
  var checkLink = doc.querySelector("[data-check-link]");
  if (checkLink && doc.getElementById("check")) {
    checkLink.href = "#check";
    checkLink.textContent = "Take the two minute check";
  }

  var mq = function (q) {
    return window.matchMedia ? window.matchMedia(q).matches : false;
  };
  var reduceMotion = mq("(prefers-reduced-motion: reduce)");
  var finePointer = mq("(hover: hover) and (pointer: fine)");

  function $(sel, ctx) {
    return (ctx || doc).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel));
  }
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function sum(arr) {
    return arr.reduce(function (a, b) {
      return a + b;
    }, 0);
  }

  /* Animate a number from one value to another. Returns a cancel function. */
  function tween(from, to, duration, onStep, onDone) {
    if (reduceMotion || duration <= 0) {
      onStep(to);
      if (onDone) onDone();
      return function () {};
    }
    var start = null;
    var raf;
    function frame(ts) {
      if (start === null) start = ts;
      var t = clamp((ts - start) / duration, 0, 1);
      onStep(from + (to - from) * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    raf = requestAnimationFrame(frame);
    return function () {
      cancelAnimationFrame(raf);
    };
  }

  /* Run a callback once, the first time an element scrolls into view. */
  function onceVisible(el, cb, threshold) {
    if (!("IntersectionObserver" in window)) {
      cb();
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            io.disconnect();
            cb();
          }
        });
      },
      { threshold: threshold || 0.3 }
    );
    io.observe(el);
  }

  var gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  var whole = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

  /* ------------------------------------------------------------------
     Segmented tabs with a sliding indicator (live card and checks)
     ------------------------------------------------------------------ */
  function segmentedTabs(list, onChange) {
    var tabs = $$('[role="tab"]', list);
    if (!tabs.length) return;

    var ind = doc.createElement("span");
    ind.className = "seg__ind";
    ind.setAttribute("aria-hidden", "true");
    list.insertBefore(ind, list.firstChild);
    list.classList.add("has-ind");

    function current() {
      return (
        tabs.filter(function (t) {
          return t.getAttribute("aria-selected") === "true";
        })[0] || tabs[0]
      );
    }
    function place(tab) {
      ind.style.width = tab.offsetWidth + "px";
      ind.style.transform = "translateX(" + tab.offsetLeft + "px)";
    }
    function select(tab, moveFocus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      place(tab);
      if (moveFocus) tab.focus();
      onChange(tab);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        if (tab.getAttribute("aria-selected") !== "true") select(tab);
      });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });

    place(current());
    window.addEventListener("resize", function () {
      place(current());
    });
    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(function () {
        place(current());
      });
    }
  }

  /* ------------------------------------------------------------------
     Scroll progress bar
     ------------------------------------------------------------------ */
  (function () {
    var bar = $("[data-scroll-progress]");
    if (!bar) return;
    var queued = false;
    function update() {
      queued = false;
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--p", max > 0 ? clamp(window.scrollY / max, 0, 1).toFixed(4) : 0);
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!queued) {
          queued = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update);
    update();
  })();

  /* ------------------------------------------------------------------
     Hero: drifting data network that reaches toward the cursor
     ------------------------------------------------------------------ */
  (function () {
    var hero = $("[data-hero-net]");
    var canvas = hero && $("canvas", hero);
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var LINK = 130;
    var REACH = 170;
    var W = 0;
    var H = 0;
    var nodes = [];
    var pointer = { x: 0, y: 0, on: false };
    var running = false;
    var inView = true;
    var raf;

    function makeNode() {
      var hex = Math.random() < 0.18;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: hex ? 4 + Math.random() * 2.5 : 1.1 + Math.random() * 1.3,
        hex: hex
      };
    }

    function resize() {
      var rect = hero.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var sx = W ? rect.width / W : 1;
      var sy = H ? rect.height / H : 1;
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes.forEach(function (n) {
        n.x *= sx;
        n.y *= sy;
      });
      var target = Math.round(clamp((W * H) / 15000, 22, 72));
      while (nodes.length < target) nodes.push(makeNode());
      nodes.length = Math.min(nodes.length, target);
      if (!running) draw();
    }

    function hexagon(x, y, r) {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = (Math.PI / 3) * i - Math.PI / 2;
        var px = x + r * Math.cos(a);
        var py = y + r * Math.sin(a);
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
    }

    function move() {
      nodes.forEach(function (n) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = W + 20;
        else if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        else if (n.y > H + 20) n.y = -20;
        if (pointer.on) {
          var dx = pointer.x - n.x;
          var dy = pointer.y - n.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < REACH && d > 1) {
            var pull = 0.35 * (1 - d / REACH);
            n.x += (dx / d) * pull;
            n.y += (dy / d) * pull;
          }
        }
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      var i, j, a, b, dx, dy, d;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          if (dx > LINK || dx < -LINK || dy > LINK || dy < -LINK) continue;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = "rgba(107,118,136," + (0.22 * (1 - d / LINK)).toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        if (pointer.on) {
          dx = a.x - pointer.x;
          dy = a.y - pointer.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < REACH) {
            ctx.strokeStyle = "rgba(163,131,58," + (0.5 * (1 - d / REACH)).toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }
      nodes.forEach(function (n) {
        if (n.hex) {
          hexagon(n.x, n.y, n.r);
          ctx.fillStyle = "rgba(201,168,76,0.14)";
          ctx.fill();
          ctx.strokeStyle = "rgba(163,131,58,0.6)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.lineWidth = 1;
        } else {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(8,15,28,0.3)";
          ctx.fill();
        }
      });
    }

    function loop() {
      move();
      draw();
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (running || reduceMotion || !inView || doc.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    resize();
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero);
    else window.addEventListener("resize", resize);

    if (reduceMotion) return; // one still frame is enough

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) start();
        else stop();
      }).observe(hero);
    }
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) stop();
      else start();
    });
    if (finePointer) {
      hero.addEventListener("pointermove", function (e) {
        var rect = hero.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
        pointer.on = true;
      });
      hero.addEventListener("pointerleave", function () {
        pointer.on = false;
      });
    }
    start();
  })();

  /* ------------------------------------------------------------------
     Hero: live report card (switch measure, hover, refresh)
     ------------------------------------------------------------------ */
  (function () {
    var card = $("[data-live-card]");
    if (!card) return;

    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var X0 = 10;
    var X1 = 370;
    var Y0 = 14;
    var Y1 = 128;

    function pctChange(a, b) {
      var p = ((a - b) / b) * 100;
      return { up: p >= 0, text: (p >= 0 ? "▲ " : "▼ ") + Math.abs(p).toFixed(1) + "%" };
    }

    // Illustrative monthly figures, January to December.
    var METRICS = {
      revenue: {
        label: "Revenue",
        data: [252, 244, 268, 261, 289, 283, 305, 298, 327, 341, 356, 378],
        fmt: function (v) {
          return "£" + Math.round(v) + "k";
        },
        total: function (d) {
          return "£" + (sum(d) / 1000).toFixed(2) + "m";
        },
        totalLabel: "12 month total",
        delta: pctChange,
        wobble: 0.02
      },
      margin: {
        label: "Gross margin",
        data: [36.4, 35.9, 37.1, 36.8, 38.0, 37.6, 38.9, 38.5, 39.8, 40.3, 40.7, 41.2],
        fmt: function (v) {
          return v.toFixed(1) + "%";
        },
        total: function (d) {
          return (sum(d) / d.length).toFixed(1) + "%";
        },
        totalLabel: "12 month average",
        delta: function (a, b) {
          var diff = a - b;
          return { up: diff >= 0, text: (diff >= 0 ? "▲ " : "▼ ") + Math.abs(diff).toFixed(1) + "pp" };
        },
        wobble: 0.006
      },
      orders: {
        label: "Orders",
        data: [1840, 1795, 1962, 1910, 2148, 2090, 2305, 2261, 2476, 2552, 2689, 2812],
        fmt: function (v) {
          return whole.format(v);
        },
        total: function (d) {
          return whole.format(sum(d));
        },
        totalLabel: "12 month total",
        delta: pctChange,
        wobble: 0.02
      }
    };

    var chart = $("[data-chart]", card);
    var svg = $("svg", chart);
    var line = $("[data-line]", card);
    var area = $("[data-area]", card);
    var cross = $("[data-cross]", card);
    var dot = $("[data-dot]", card);
    var tip = $("[data-tip]", card);
    var tipMonth = $("[data-tip-month]", card);
    var tipValue = $("[data-tip-value]", card);
    var live = $("[data-chart-live]", card);
    var chips = {
      latest: $('[data-chip="latest"]', card),
      delta: $('[data-chip="delta"]', card),
      total: $('[data-chip="total"]', card),
      totalLabel: $('[data-chip-label="total"]', card)
    };
    var refreshBtn = $("[data-refresh]", card);
    var refreshLabel = $("[data-refresh-label]", card);

    var key = "revenue";
    var shown = normalise(METRICS[key].data); // what is drawn right now, 0 to 1
    var hoverIndex = null;
    var cancelMorph = function () {};

    function normalise(data) {
      var lo = Math.min.apply(null, data);
      var hi = Math.max.apply(null, data);
      var span = hi - lo || 1;
      var floor = lo - span * 0.15;
      var ceil = hi + span * 0.08;
      return data.map(function (v) {
        return (v - floor) / (ceil - floor);
      });
    }
    function xAt(i) {
      return X0 + ((X1 - X0) * i) / 11;
    }
    function yAt(n) {
      return Y1 - n * (Y1 - Y0);
    }

    function render(norm) {
      var d = norm
        .map(function (n, i) {
          return (i ? "L" : "M") + xAt(i).toFixed(1) + "," + yAt(n).toFixed(1);
        })
        .join(" ");
      line.setAttribute("d", d);
      area.setAttribute("d", d + " L" + X1 + ",150 L" + X0 + ",150 Z");
      placeMarker(hoverIndex === null ? 11 : hoverIndex, norm);
    }

    function placeMarker(i, norm) {
      var x = xAt(i);
      var y = yAt(norm[i]);
      dot.setAttribute("cx", x.toFixed(1));
      dot.setAttribute("cy", y.toFixed(1));
      cross.setAttribute("x1", x.toFixed(1));
      cross.setAttribute("x2", x.toFixed(1));
      return { x: x, y: y };
    }

    function updateChips(animate) {
      var m = METRICS[key];
      var d = m.data;
      var latest = d[11];
      var change = m.delta(latest, d[10]);
      chips.delta.textContent = change.text;
      chips.delta.classList.toggle("chip__value--up", change.up);
      chips.delta.classList.toggle("chip__value--down", !change.up);
      chips.total.textContent = m.total(d);
      chips.totalLabel.textContent = m.totalLabel;
      if (animate) {
        tween(latest * 0.86, latest, 700, function (v) {
          chips.latest.textContent = m.fmt(v);
        });
      } else {
        chips.latest.textContent = m.fmt(latest);
      }
    }

    function morphTo(target) {
      cancelMorph();
      var from = shown.slice();
      cancelMorph = tween(0, 1, 650, function (t) {
        shown = from.map(function (f, i) {
          return f + (target[i] - f) * t;
        });
        render(shown);
      });
    }

    function showHover(i) {
      hoverIndex = i;
      var pos = placeMarker(i, shown);
      var m = METRICS[key];
      tipMonth.textContent = MONTHS[i];
      tipValue.textContent = m.fmt(m.data[i]);
      var rect = svg.getBoundingClientRect();
      var scale = rect.width / 380;
      var half = tip.offsetWidth / 2;
      var left = clamp(pos.x * scale, half, rect.width - half);
      tip.style.left = left + "px";
      tip.style.top = pos.y * scale + "px";
      chart.classList.add("is-hover");
    }
    function hideHover() {
      hoverIndex = null;
      chart.classList.remove("is-hover");
      placeMarker(11, shown);
    }
    function announce(i) {
      var m = METRICS[key];
      live.textContent = MONTHS[i] + ", " + m.label + " " + m.fmt(m.data[i]);
    }

    svg.addEventListener("pointermove", function (e) {
      var rect = svg.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 380;
      showHover(clamp(Math.round(((x - X0) / (X1 - X0)) * 11), 0, 11));
    });
    svg.addEventListener("pointerleave", hideHover);

    chart.addEventListener("focus", function () {
      showHover(11);
      announce(11);
    });
    chart.addEventListener("blur", hideHover);
    chart.addEventListener("keydown", function (e) {
      var i = hoverIndex === null ? 11 : hoverIndex;
      if (e.key === "ArrowLeft") i = Math.max(0, i - 1);
      else if (e.key === "ArrowRight") i = Math.min(11, i + 1);
      else if (e.key === "Home") i = 0;
      else if (e.key === "End") i = 11;
      else return;
      e.preventDefault();
      showHover(i);
      announce(i);
    });

    var tabList = $("[data-metric-tabs]", card);
    if (tabList) {
      segmentedTabs(tabList, function (tab) {
        key = tab.getAttribute("data-metric");
        chart.setAttribute(
          "aria-label",
          METRICS[key].label + " by month. Use the left and right arrow keys to read each month."
        );
        [chips.latest, chips.delta, chips.total].forEach(function (c) {
          c.classList.add("is-swapping");
        });
        setTimeout(
          function () {
            updateChips(true);
            [chips.latest, chips.delta, chips.total].forEach(function (c) {
              c.classList.remove("is-swapping");
            });
          },
          reduceMotion ? 0 : 160
        );
        morphTo(normalise(METRICS[key].data));
        if (hoverIndex !== null) showHover(hoverIndex);
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        refreshBtn.disabled = true;
        refreshBtn.classList.add("is-refreshing");
        refreshLabel.textContent = "Refreshing";
        setTimeout(
          function () {
            // Nudge the latest month a little so a refresh visibly lands.
            var m = METRICS[key];
            var jitter = (Math.random() * 2 - 1) * m.wobble;
            m.data[11] = Math.round(m.data[11] * (1 + jitter) * 10) / 10;
            var now = new Date();
            var hhmm = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);
            refreshLabel.textContent = "Refreshed " + hhmm;
            live.textContent = "Report refreshed at " + hhmm;
            refreshBtn.classList.remove("is-refreshing");
            refreshBtn.disabled = false;
            updateChips(true);
            morphTo(normalise(m.data));
          },
          reduceMotion ? 200 : 900
        );
      });
    }

    // Draw the line in the first time the card is seen.
    render(shown);
    if (!reduceMotion && line.getTotalLength) {
      var len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      area.style.opacity = "0";
      dot.style.opacity = "0";
      onceVisible(
        card,
        function () {
          line.getBoundingClientRect(); // commit the start state
          line.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.6, 0, 0.2, 1)";
          area.style.transition = "opacity 1s ease 0.6s";
          dot.style.transition = "opacity 0.4s ease 1.3s";
          line.style.strokeDashoffset = "0";
          area.style.opacity = "1";
          dot.style.opacity = "1";
          setTimeout(function () {
            // hand control back so morphing is not held by the dash pattern
            line.style.transition = "";
            line.style.strokeDasharray = "";
            line.style.strokeDashoffset = "";
          }, 1700);
        },
        0.4
      );
    }
  })();

  /* ------------------------------------------------------------------
     Capability strip marquee
     ------------------------------------------------------------------ */
  $$("[data-marquee]").forEach(function (box) {
    var list = $(".strip__list", box);
    if (!list || reduceMotion) return;
    $$("span", list).forEach(function (item) {
      var copy = item.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      list.appendChild(copy);
    });
    box.classList.add("is-ready");
  });

  /* ------------------------------------------------------------------
     Before and after comparison
     ------------------------------------------------------------------ */
  $$("[data-compare]").forEach(function (box) {
    var range = $("[data-compare-range]", box);
    var dragging = false;
    var touched = false;
    var startX = 0;
    // On narrow screens start further right, so the spreadsheet's problems
    // are on show before anyone drags.
    var home = window.innerWidth < 720 ? 62 : 50;

    function setPos(p) {
      p = clamp(p, 0, 100);
      box.style.setProperty("--pos", p + "%");
      if (range) range.value = Math.round(p);
    }
    function fromPointer(e) {
      var rect = box.getBoundingClientRect();
      return ((e.clientX - rect.left) / rect.width) * 100;
    }

    box.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      touched = true;
      startX = e.clientX;
      box.classList.add("is-dragging");
      if (e.pointerType === "mouse") setPos(fromPointer(e)); // touch waits for a sideways move
      try {
        box.setPointerCapture(e.pointerId);
      } catch (err) {
        /* not supported, dragging still works while over the box */
      }
    });
    box.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      if (e.pointerType !== "mouse" && Math.abs(e.clientX - startX) < 4) return;
      setPos(fromPointer(e));
    });
    function stopDrag() {
      dragging = false;
      box.classList.remove("is-dragging");
    }
    box.addEventListener("pointerup", stopDrag);
    box.addEventListener("pointercancel", stopDrag);
    box.addEventListener("lostpointercapture", stopDrag);

    if (range) {
      range.addEventListener("input", function () {
        touched = true;
        setPos(+range.value);
      });
    }
    setPos(home);

    // A small nudge the first time it is seen, so people know it moves.
    if (!reduceMotion) {
      onceVisible(
        box,
        function () {
          var stops = [home, home - 14, home + 14, home];
          var i = 0;
          (function next() {
            if (touched || i >= stops.length - 1) return;
            var a = stops[i];
            var b = stops[++i];
            tween(a, b, 520, function (v) {
              if (!touched) setPos(v);
            }, next);
          })();
        },
        0.55
      );
    }
  });

  /* ------------------------------------------------------------------
     Checks: tab switching
     ------------------------------------------------------------------ */
  (function () {
    var list = $("[data-tool-tabs]");
    if (!list) return;
    segmentedTabs(list, function (tab) {
      $$('[role="tab"]', list).forEach(function (t) {
        var panel = doc.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = t !== tab;
      });
    });
  })();

  /* ------------------------------------------------------------------
     Reporting health check
     ------------------------------------------------------------------ */
  (function () {
    var quiz = $("[data-quiz]");
    if (!quiz) return;

    var QUESTIONS = [
      {
        q: "When two people pull the same number, do they get the same answer?",
        area: "strategy",
        answers: [["Always", 2], ["Usually, after some back and forth", 1], ["Rarely", 0]]
      },
      {
        q: "How long does your month end or weekly reporting take to prepare?",
        area: "reporting",
        answers: [["Under a day, it is mostly automated", 2], ["A day or two", 1], ["Most of a week", 0]]
      },
      {
        q: "Where does the data behind your reports actually live?",
        area: "data-warehousing",
        answers: [
          ["One governed platform", 2],
          ["A few systems plus some spreadsheets", 1],
          ["Spreadsheets, inboxes, and people's memories", 0]
        ]
      },
      {
        q: "If your main report builder left tomorrow, what would happen?",
        area: "training",
        answers: [["Someone else would pick it up easily", 2], ["A painful few weeks", 1], ["Reporting would stop", 0]]
      },
      {
        q: "How much does leadership trust the numbers they are shown?",
        area: "power-bi",
        answers: [
          ["They act on them as they are", 2],
          ["They trust them, but double check", 1],
          ["They ask for the spreadsheet behind it", 0]
        ]
      }
    ];

    var ADVICE = {
      strategy: {
        title: "Data and BI strategy",
        why: "Different answers to the same question usually mean the definitions were never agreed. That is a strategy problem before it is a tooling one."
      },
      reporting: {
        title: "Reporting modernization",
        why: "Time spent rebuilding the same report every period is the easiest win there is. Automate the refresh and the days come back."
      },
      "data-warehousing": {
        title: "Data warehousing and pipelines",
        why: "When data lives in inboxes and memories, every report starts with a scavenger hunt. One governed source ends that."
      },
      training: {
        title: "Training and enablement",
        why: "If reporting depends on one person, the real risk is not the report, it is their holiday. Shared, documented models spread the load."
      },
      "power-bi": {
        title: "Power BI consulting and development",
        why: "When leadership asks for the spreadsheet behind a chart, the model underneath needs rebuilding so the numbers can be trusted as they stand."
      },
      fabric: {
        title: "Microsoft Fabric implementation",
        why: "Your foundations are solid. The next gains usually come from bringing everything onto one platform and letting more people answer their own questions."
      }
    };

    var VERDICTS = [
      {
        min: 8,
        title: "In good shape",
        text: "Your reporting is in better shape than most. The gains from here are about speed, and letting more people help themselves."
      },
      {
        min: 4,
        title: "Solid in places, fragile in others",
        text: "Some of this works well, and some of it works because people work hard around it. The weak spots below are where I would look first."
      },
      {
        min: 0,
        title: "Running on goodwill",
        text: "Your reporting works because people work very hard to make it work. That is fixable, and usually faster than people expect."
      }
    ];

    var stage = $("[data-quiz-stage]", quiz);
    var count = $("[data-quiz-count]", quiz);
    var dots = $("[data-quiz-dots]", quiz);
    var question = $("[data-quiz-q]", quiz);
    var answersBox = $("[data-quiz-answers]", quiz);
    var back = $("[data-quiz-back]", quiz);
    var result = $("[data-quiz-result]", quiz);
    var gauge = $("[data-gauge]", quiz);
    var scoreEl = $("[data-score]", quiz);
    var verdict = $("[data-verdict]", quiz);
    var verdictText = $("[data-verdict-text]", quiz);
    var recs = $("[data-recs]", quiz);
    var restart = $("[data-quiz-restart]", quiz);

    var picked = [];
    var index = 0;
    var CIRC = 2 * Math.PI * 52;

    function drawDots() {
      dots.innerHTML = "";
      QUESTIONS.forEach(function (_, i) {
        var d = doc.createElement("span");
        d.className = "quiz__dot" + (i < index ? " is-done" : "") + (i === index ? " is-now" : "");
        dots.appendChild(d);
      });
    }

    function showQuestion(i, moveFocus) {
      index = i;
      var item = QUESTIONS[i];
      count.textContent = "Question " + (i + 1) + " of " + QUESTIONS.length;
      question.textContent = item.q;
      answersBox.innerHTML = "";
      item.answers.forEach(function (pair, k) {
        var btn = doc.createElement("button");
        btn.type = "button";
        btn.className = "quiz__answer";
        btn.setAttribute("aria-pressed", picked[i] === k ? "true" : "false");
        var keyCap = doc.createElement("span");
        keyCap.className = "quiz__key";
        keyCap.setAttribute("aria-hidden", "true");
        keyCap.textContent = String.fromCharCode(65 + k);
        var label = doc.createElement("span");
        label.textContent = pair[0];
        btn.appendChild(keyCap);
        btn.appendChild(label);
        btn.addEventListener("click", function () {
          choose(k, btn);
        });
        answersBox.appendChild(btn);
      });
      back.hidden = i === 0;
      drawDots();
      stage.classList.remove("is-enter");
      void stage.offsetWidth; // restart the entrance animation
      stage.classList.add("is-enter");
      if (moveFocus) question.focus();
    }

    function choose(k, btn) {
      picked[index] = k;
      $$(".quiz__answer", answersBox).forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      setTimeout(
        function () {
          if (index < QUESTIONS.length - 1) showQuestion(index + 1, true);
          else showResult();
        },
        reduceMotion ? 0 : 260
      );
    }

    function showResult() {
      var score = 0;
      var weakest = QUESTIONS.map(function (item, i) {
        var points = item.answers[picked[i]][1];
        score += points;
        return { area: item.area, points: points, order: i };
      });
      weakest.sort(function (a, b) {
        return a.points - b.points || a.order - b.order;
      });
      var areas = weakest
        .filter(function (w) {
          return w.points < 2;
        })
        .slice(0, 2)
        .map(function (w) {
          return w.area;
        });
      if (!areas.length) areas = ["fabric"];

      var band = VERDICTS.filter(function (v) {
        return score >= v.min;
      })[0];
      verdict.textContent = band.title;
      verdictText.textContent = band.text;

      recs.innerHTML = "";
      areas.forEach(function (area) {
        var advice = ADVICE[area];
        var box = doc.createElement("div");
        box.className = "quiz__rec";
        var h = doc.createElement("h5");
        h.textContent = advice.title;
        var p = doc.createElement("p");
        p.textContent = advice.why;
        var a = doc.createElement("a");
        a.href = "contact.html?service=" + area;
        a.textContent = "Talk to me about this →";
        box.appendChild(h);
        box.appendChild(p);
        box.appendChild(a);
        recs.appendChild(box);
      });

      stage.hidden = true;
      result.hidden = false;
      gauge.style.strokeDashoffset = CIRC;
      gauge.getBoundingClientRect();
      gauge.style.strokeDashoffset = CIRC * (1 - score / 10);
      tween(0, score, 1100, function (v) {
        scoreEl.textContent = Math.round(v);
      });
      verdict.focus();
    }

    back.addEventListener("click", function () {
      if (index > 0) showQuestion(index - 1, true);
    });
    restart.addEventListener("click", function () {
      picked = [];
      result.hidden = true;
      stage.hidden = false;
      showQuestion(0, true);
    });

    gauge.style.strokeDasharray = CIRC;
    showQuestion(0, false);
  })();

  /* ------------------------------------------------------------------
     Cost of manual reporting calculator
     ------------------------------------------------------------------ */
  (function () {
    var calc = $("[data-calc]");
    if (!calc) return;

    var input = {};
    var output = {};
    var result = {};
    $$("[data-in]", calc).forEach(function (el) {
      input[el.getAttribute("data-in")] = el;
    });
    $$("[data-out]", calc).forEach(function (el) {
      output[el.getAttribute("data-out")] = el;
    });
    $$("[data-res]", calc).forEach(function (el) {
      result[el.getAttribute("data-res")] = el;
    });
    var live = $("[data-calc-live]", calc);

    var FORMAT = {
      hours: function (v) {
        return whole.format(v);
      },
      cost: function (v) {
        return gbp.format(v);
      },
      back: function (v) {
        return whole.format(v) + " hours";
      },
      backcost: function (v) {
        return gbp.format(v);
      }
    };
    var current = { hours: 576, cost: 20160, back: 288, backcost: 10080 };
    var cancels = {};
    var liveTimer;

    function paintTrack(el) {
      var pct = ((el.value - el.min) / (el.max - el.min)) * 100;
      el.style.setProperty("--fill", pct + "%");
    }

    function animate(name, to) {
      if (cancels[name]) cancels[name]();
      cancels[name] = tween(current[name], to, 420, function (v) {
        current[name] = v;
        result[name].textContent = FORMAT[name](v);
      });
    }

    function update() {
      var people = +input.people.value;
      var hours = +input.hours.value;
      var rate = +input.rate.value;
      var share = +input.share.value;

      output.people.textContent = people + (people === 1 ? " person" : " people");
      output.hours.textContent = hours + (hours === 1 ? " hour" : " hours");
      output.rate.textContent = gbp.format(rate);
      output.share.textContent = share + "%";

      var yearHours = people * hours * 12;
      var cost = yearHours * rate;
      var back = (yearHours * share) / 100;
      var weeks = Math.round(yearHours / 37.5);

      animate("hours", yearHours);
      animate("cost", cost);
      animate("back", back);
      animate("backcost", back * rate);
      result.weeks.textContent =
        weeks < 1 ? "less than one working week" : "about " + weeks + " working week" + (weeks === 1 ? "" : "s");
      result.sharepct.textContent = share + "%";
      calc.style.setProperty("--share", share + "%");
      Object.keys(input).forEach(function (k) {
        paintTrack(input[k]);
      });

      clearTimeout(liveTimer);
      liveTimer = setTimeout(function () {
        live.textContent =
          whole.format(yearHours) +
          " hours a year on reporting, costing " +
          gbp.format(cost) +
          ". " +
          whole.format(back) +
          " hours back at " +
          share +
          "% automated.";
      }, 700);
    }

    Object.keys(input).forEach(function (k) {
      input[k].addEventListener("input", update);
    });
    update();
  })();

  /* ------------------------------------------------------------------
     Count up the honest numbers
     ------------------------------------------------------------------ */
  $$("[data-count]").forEach(function (el) {
    var target = +el.getAttribute("data-count");
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion || !target) return;
    el.textContent = "0" + suffix;
    onceVisible(
      el,
      function () {
        tween(0, target, 1400, function (v) {
          el.textContent = Math.round(v) + suffix;
        });
      },
      0.6
    );
  });

  /* ------------------------------------------------------------------
     Process timeline that fills as you scroll through it
     ------------------------------------------------------------------ */
  (function () {
    var proc = $("[data-timeline]");
    if (!proc) return;
    var steps = $$(".process__step", proc);
    var queued = false;
    function update() {
      queued = false;
      var rect = proc.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = reduceMotion ? 1 : clamp((vh * 0.85 - rect.top) / (rect.height + vh * 0.3), 0, 1);
      steps.forEach(function (step, i) {
        var fill = clamp(p * steps.length - i, 0, 1);
        step.style.setProperty("--fill", fill.toFixed(3));
        step.classList.toggle("is-lit", fill > 0.05);
      });
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!queued) {
          queued = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update);
    update();
  })();

  /* ------------------------------------------------------------------
     Cursor spotlight on services, gentle tilt on example cards
     ------------------------------------------------------------------ */
  if (finePointer) {
    $$(".service-row").forEach(function (row) {
      row.addEventListener("pointermove", function (e) {
        var rect = row.getBoundingClientRect();
        row.style.setProperty("--mx", e.clientX - rect.left + "px");
        row.style.setProperty("--my", e.clientY - rect.top + "px");
      });
    });

    $$(".case-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        card.style.setProperty("--gx", px * 100 + "%");
        card.style.setProperty("--gy", py * 100 + "%");
        if (!reduceMotion) {
          card.style.transform =
            "perspective(900px) rotateX(" +
            ((0.5 - py) * 6).toFixed(2) +
            "deg) rotateY(" +
            ((px - 0.5) * 7).toFixed(2) +
            "deg) translateY(-3px)";
        }
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */
  (function () {
    var items = $$("[data-reveal]");
    if (!items.length) return;
    function revealAll() {
      items.forEach(function (el) {
        el.classList.add("is-in");
      });
    }
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    items.forEach(function (el) {
      io.observe(el);
    });
    window.addEventListener("beforeprint", revealAll);
  })();
})();
