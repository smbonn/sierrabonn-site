// Renders /data/substack-posts.json into #substack-feed.
// That JSON file is regenerated automatically by a GitHub Action
// (.github/workflows/update-substack.yml) that reads the Substack RSS feed.
// Because the fetch below is same-origin (your own domain, not Substack's),
// there is no CORS problem and no third-party script running on your site.
document.addEventListener("DOMContentLoaded", function () {
  var mount = document.getElementById("substack-feed");
  if (!mount) return;

  fetch("/data/substack-posts.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("Feed file not found");
      return res.json();
    })
    .then(function (posts) {
      if (!posts || !posts.length) {
        mount.innerHTML = '<p class="feed-status">New essays are on the way. In the meantime, ' +
          '<a href="https://sierramariebonn.substack.com/">read the full Substack archive</a>.</p>';
        return;
      }
      var html = posts.slice(0, 9).map(function (post) {
        var date = post.pubDate ? new Date(post.pubDate).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric"
        }) : "";
        return (
          '<div class="card article-card">' +
            (post.category ? '<span class="tag">' + escapeHtml(post.category) + '</span>' : '') +
            '<h3>' + escapeHtml(post.title) + '</h3>' +
            '<p class="meta">' + date + '</p>' +
            '<p>' + escapeHtml(post.excerpt || "") + '</p>' +
            '<a class="card-link" href="' + post.link + '">Read on Substack &rarr;</a>' +
          '</div>'
        );
      }).join("");
      mount.innerHTML = html;
    })
    .catch(function () {
      mount.innerHTML = '<p class="feed-status">Browse the latest essays directly on ' +
        '<a href="https://sierramariebonn.substack.com/">Sierra’s Substack</a>.</p>';
    });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
});
