// МилаМанга — вся логика работает без сервера, данные в titles.js,
// закладки хранятся в localStorage браузера.
(function () {
  "use strict";
  var grid = document.getElementById("grid");
  var searchInput = document.getElementById("search");
  var chipsRow = document.getElementById("genres-row");
  var emptyMsg = document.getElementById("empty");
  var bmCountEl = document.getElementById("bm-count");
  var newsBlock = document.getElementById("news-block");
  var modal = document.getElementById("modal");
  var LS_KEY = "mila-bookmarks";

  var view = "catalog";   // catalog | popular | updates | news | genres | bookmarks | random
  var genreFilter = "Все";
  var query = "";

  function loadBookmarks() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  var bookmarks = loadBookmarks();

  function saveBookmarks() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(bookmarks)); } catch (e) {}
    bmCountEl.textContent = String(bookmarks.length);
  }
  function isSaved(id) { return bookmarks.indexOf(id) !== -1; }
  function toggleBookmark(id) {
    var i = bookmarks.indexOf(id);
    if (i === -1) { bookmarks.push(id); } else { bookmarks.splice(i, 1); }
    saveBookmarks();
    render();
    syncModalButton();
  }

  // Жанры из данных + "Все"
  var genres = ["Все"];
  TITLES.forEach(function (t) {
    t.genres.forEach(function (g) { if (genres.indexOf(g) === -1) genres.push(g); });
  });
  genres.forEach(function (g) {
    var b = document.createElement("button");
    b.textContent = g;
    if (g === genreFilter) b.className = "active";
    b.addEventListener("click", function () {
      genreFilter = g;
      var btns = chipsRow.querySelectorAll("button");
      btns.forEach(function (x) { x.className = ""; });
      b.className = "active";
      render();
    });
    chipsRow.appendChild(b);
  });

  function coverStyle(t) {
    return "background: linear-gradient(135deg, hsl(" + t.hue + ", 65%, 32%), hsl(" + ((t.hue + 50) % 360) + ", 70%, 18%));";
  }

  function filtered() {
    var list = TITLES.slice();
    if (view === "popular") {
      list.sort(function (a, b) { return b.rating - a.rating; });
    } else if (view === "updates") {
      list = list.filter(function (t) { return t.status === "онгоинг"; });
    } else if (view === "bookmarks") {
      list = list.filter(function (t) { return isSaved(t.id); });
    }
    if (genreFilter !== "Все") {
      list = list.filter(function (t) { return t.genres.indexOf(genreFilter) !== -1; });
    }
    if (query) {
      var q = query.toLowerCase();
      list = list.filter(function (t) {
        return t.title.toLowerCase().indexOf(q) !== -1 ||
          t.genres.join(" ").toLowerCase().indexOf(q) !== -1;
      });
    }
    return list;
  }

  function render() {
    var list = filtered();
    grid.innerHTML = "";
    emptyMsg.classList.toggle("hidden", list.length !== 0);
    list.forEach(function (t) {
      var card = document.createElement("article");
      card.className = "card";
      var bmLabel = isSaved(t.id) ? "🔖" : "🤍";
      card.innerHTML =
        '<div class="cover" style="' + coverStyle(t) + '">' + t.emoji +
        '<button class="bm-mini" title="В закладки">' + bmLabel + "</button></div>" +
        '<div class="card-body"><h3>' + escapeHtml(t.title) + "</h3>" +
        '<div class="tags">' + t.genres.map(function (g) { return "<span>" + escapeHtml(g) + "</span>"; }).join("") + "</div>" +
        '<p class="meta">⭐ ' + t.rating.toFixed(1) + " · " + escapeHtml(t.status) + "</p>" +
        '<p class="desc">' + escapeHtml(t.desc) + "</p></div>";
      card.querySelector(".bm-mini").addEventListener("click", function (ev) {
        ev.stopPropagation();
        toggleBookmark(t.id);
      });
      card.addEventListener("click", function () { openModal(t); });
      grid.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Модалка (карточка тайтла)
  var modalTitle = null;
  function openModal(t) {
    modalTitle = t;
    document.getElementById("modal-cover").innerHTML = t.emoji;
    document.getElementById("modal-cover").setAttribute("style", coverStyle(t));
    document.getElementById("modal-title").textContent = t.title;
    document.getElementById("modal-meta").textContent =
      "⭐ " + t.rating.toFixed(1) + " · " + t.status + " · " + t.genres.join(", ");
    document.getElementById("modal-desc").textContent = t.desc;
    syncModalButton();
    modal.classList.remove("hidden");
  }
  function syncModalButton() {
    if (!modalTitle) return;
    var btn = document.getElementById("modal-bm");
    if (isSaved(modalTitle.id)) {
      btn.textContent = "🔖 В закладках — убрать";
      btn.className = "bm-btn saved";
    } else {
      btn.textContent = "🤍 В закладки";
      btn.className = "bm-btn";
    }
  }
  function closeModal() { modal.classList.add("hidden"); modalTitle = null; }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", function (ev) { if (ev.target === modal) closeModal(); });
  document.getElementById("modal-bm").addEventListener("click", function () {
    if (modalTitle) toggleBookmark(modalTitle.id);
  });

  // Меню
  var menuBtns = document.querySelectorAll("#menu button");
  menuBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var v = btn.getAttribute("data-view");
      if (v === "random") {
        var pool = TITLES.slice();
        openModal(pool[Math.floor(Math.random() * pool.length)]);
        return;
      }
      view = v;
      menuBtns.forEach(function (x) { x.classList.remove("active"); });
      btn.classList.add("active");
      newsBlock.classList.toggle("hidden", v !== "news");
      if (v === "genres") {
        document.getElementById("genres-row").scrollIntoView({ behavior: "smooth", block: "center" });
      }
      render();
    });
  });
  document.getElementById("logo").addEventListener("click", function (ev) {
    ev.preventDefault();
    view = "catalog";
    menuBtns.forEach(function (x) { x.classList.remove("active"); });
    document.querySelector('#menu button[data-view="catalog"]').classList.add("active");
    newsBlock.classList.add("hidden");
    render();
  });

  // Живой поиск
  searchInput.addEventListener("input", function () {
    query = searchInput.value.trim();
    render();
  });

  saveBookmarks();
  render();
})();
