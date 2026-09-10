/*
 * posts.js — a Reddit-style feed: post, comment, like, share, repost,
 * hashtag filtering, and edit/delete on your own posts.
 */
(function () {
  "use strict";

  var CJ = window.CJ;
  var posts = [];
  var searchTerm = "";
  var hashtagFilter = null;
  var expandedPostId = null;
  var editingPostId = null;
  var replyTargetId = null;

  document.addEventListener("DOMContentLoaded", function () {
    posts = CJ.getPosts();
    var session = CJ.getSession();
    var myName = (session && session.name) || "Runner";

    var feedEl = document.getElementById("posts-feed");
    var searchInput = document.getElementById("post-search");
    var newPostBtn = document.getElementById("new-post-button");

    var hashtagFilterBar = document.getElementById("hashtag-filter");
    var hashtagFilterLabel = document.getElementById("hashtag-filter-label");
    var clearHashtagBtn = document.getElementById("clear-hashtag-filter");
    var breadcrumbTopic = document.getElementById("breadcrumb-topic");

    var topicListEl = document.getElementById("topic-list");
    var toggleTopicsBtn = document.getElementById("toggle-topics");

    toggleTopicsBtn.addEventListener("click", function () {
      var expanded = toggleTopicsBtn.getAttribute("aria-expanded") === "true";
      topicListEl.hidden = expanded;
      toggleTopicsBtn.setAttribute("aria-expanded", String(!expanded));
    });

    var dialog = document.getElementById("post-dialog");
    var postForm = document.getElementById("post-form");
    var dialogTitle = document.getElementById("post-dialog-title");
    var titleInput = document.getElementById("post-title");
    var bodyInput = document.getElementById("post-body");
    var hashtagsInput = document.getElementById("post-hashtags");
    var imageInput = document.getElementById("post-image");
    var postError = document.getElementById("post-error");
    var closePostBtn = document.getElementById("close-post");
    var cancelPostBtn = document.getElementById("cancel-post");

    function persist() {
      var ok = CJ.savePosts(posts);
      if (!ok) CJ.showToast("Save failed — browser storage unavailable.", "error");
      return ok;
    }

    function findPost(id) {
      return posts.find(function (p) {
        return p.id === id;
      });
    }

    function initials(name) {
      var parts = name.trim().split(/\s+/);
      var first = parts[0] ? parts[0][0] : "";
      var last = parts.length > 1 ? parts[parts.length - 1][0] : "";
      return (first + last).toUpperCase();
    }

    function formatRelativeTime(ts) {
      var diff = Date.now() - ts;
      var minute = 60000;
      var hour = 60 * minute;
      var day = 24 * hour;
      if (diff < minute) return "just now";
      if (diff < hour) return Math.floor(diff / minute) + "m ago";
      if (diff < day) return Math.floor(diff / hour) + "h ago";
      if (diff < 7 * day) return Math.floor(diff / day) + "d ago";
      var d = new Date(ts);
      return CJ.monthNames[d.getMonth()].slice(0, 3) + " " + d.getDate();
    }

    function parseHashtags(raw) {
      var seen = {};
      var out = [];
      raw
        .split(/\s+/)
        .map(function (t) {
          return t.replace(/^#/, "").trim().toLowerCase();
        })
        .forEach(function (t) {
          if (t && !seen[t]) {
            seen[t] = true;
            out.push(t);
          }
        });
      return out;
    }

    function sortedPosts() {
      return posts.slice().sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });
    }

    function filteredPosts() {
      var list = sortedPosts();
      if (hashtagFilter) {
        list = list.filter(function (p) {
          return p.hashtags.indexOf(hashtagFilter) !== -1;
        });
      }
      var term = searchTerm.trim().toLowerCase();
      if (term) {
        list = list.filter(function (p) {
          return (
            p.title.toLowerCase().indexOf(term) !== -1 ||
            p.body.toLowerCase().indexOf(term) !== -1
          );
        });
      }
      return list;
    }

    function setHashtagFilter(tag) {
      hashtagFilter = tag;
      if (tag) {
        hashtagFilterBar.hidden = false;
        CJ.setText(hashtagFilterLabel, "#" + tag);
        CJ.setText(breadcrumbTopic, "#" + tag);
      } else {
        hashtagFilterBar.hidden = true;
        CJ.setText(breadcrumbTopic, "SHARE");
      }
      renderAll();
    }

    /* Topic sidebar — same idea as Reddit's community list, but built
       from the hashtags people actually used, ranked by frequency. */
    function renderTopics() {
      var counts = {};
      posts.forEach(function (p) {
        p.hashtags.forEach(function (tag) {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      });
      var tags = Object.keys(counts).sort(function (a, b) {
        return counts[b] - counts[a];
      });

      topicListEl.innerHTML = "";

      function buildRow(label, count, tag, isActive) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "topic-row" + (isActive ? " active" : "");
        var labelEl = document.createElement("span");
        labelEl.textContent = label;
        var countEl = document.createElement("span");
        countEl.className = "topic-count";
        countEl.textContent = String(count);
        row.appendChild(labelEl);
        row.appendChild(countEl);
        row.addEventListener("click", function () {
          setHashtagFilter(tag);
        });
        return row;
      }

      topicListEl.appendChild(buildRow("All posts", posts.length, null, hashtagFilter === null));
      tags.forEach(function (tag) {
        topicListEl.appendChild(
          buildRow("#" + tag, counts[tag], tag, hashtagFilter === tag)
        );
      });
    }

    clearHashtagBtn.addEventListener("click", function () {
      setHashtagFilter(null);
    });

    searchInput.addEventListener("input", function () {
      searchTerm = searchInput.value;
      renderFeed();
    });

    /* ---------- feed rendering ---------- */

    function renderFeed() {
      var list = filteredPosts();
      feedEl.innerHTML = "";

      if (posts.length === 0) {
        var empty = document.createElement("p");
        empty.className = "list-empty-state";
        empty.textContent = "No posts yet. Be the first to share something.";
        feedEl.appendChild(empty);
        return;
      }
      if (list.length === 0) {
        var noResults = document.createElement("p");
        noResults.className = "list-empty-state";
        noResults.textContent = "Nothing matches here.";
        feedEl.appendChild(noResults);
        return;
      }

      list.forEach(function (post) {
        feedEl.appendChild(buildPostCard(post));
      });
    }

    function renderAll() {
      renderFeed();
      renderTopics();
    }

    /* The one Reddit signature worth borrowing: a left-side vote column
       with real up/down arrows, reskinned in this app's own colors
       (cyan for up, crimson for down) instead of copied verbatim. */
    function buildVoteColumn(post) {
      var col = document.createElement("div");
      col.className = "post-vote";

      var upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "vote-btn up" + (post.voteState === "up" ? " active" : "");
      upBtn.setAttribute("aria-label", "Upvote");
      upBtn.innerHTML = '<span data-icon="chevron-up"></span>';
      upBtn.addEventListener("click", function () {
        vote(post.id, "up");
      });

      var scoreEl = document.createElement("span");
      scoreEl.className = "vote-score";
      scoreEl.textContent = post.score;

      var downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "vote-btn down" + (post.voteState === "down" ? " active" : "");
      downBtn.setAttribute("aria-label", "Downvote");
      downBtn.innerHTML = '<span data-icon="chevron-down"></span>';
      downBtn.addEventListener("click", function () {
        vote(post.id, "down");
      });

      col.appendChild(upBtn);
      col.appendChild(scoreEl);
      col.appendChild(downBtn);
      return col;
    }

    function buildMedia(post) {
      if (!post.media) return null;
      if (post.media.type === "image") {
        var img = document.createElement("img");
        img.className = "post-media-image";
        img.src = post.media.url;
        img.alt = post.title;
        img.loading = "lazy";
        return img;
      }
      if (post.media.type === "video") {
        var box = document.createElement("div");
        box.className = "post-media-video";
        var play = document.createElement("span");
        play.className = "video-play-badge";
        play.innerHTML = '<span data-icon="play"></span>';
        var label = document.createElement("span");
        label.className = "video-label";
        label.textContent = "VIDEO (DEMO PLACEHOLDER)";
        box.appendChild(play);
        box.appendChild(label);
        return box;
      }
      return null;
    }

    function buildPostCard(post) {
      var card = document.createElement("article");
      card.className = "post-card panel";

      var body_ = document.createElement("div");
      body_.className = "post-card-body";
      card.appendChild(buildVoteColumn(post));
      card.appendChild(body_);
      var contentHost = body_;

      if (post.repostedFromId) {
        var original = findPost(post.repostedFromId);
        var repostTag = document.createElement("div");
        repostTag.className = "post-repost-tag";
        var repostIcon = document.createElement("span");
        repostIcon.setAttribute("data-icon", "repost");
        repostTag.appendChild(repostIcon);
        repostTag.appendChild(
          document.createTextNode(
            "Reposted from " + (original ? original.authorName : "a deleted post")
          )
        );
        contentHost.appendChild(repostTag);
      }

      var header = document.createElement("div");
      header.className = "post-header";

      var avatar = document.createElement("span");
      avatar.className = "avatar-tile avatar-tile-small";
      avatar.dataset.tint = post.tint || "crimson";
      var glitch = document.createElement("span");
      glitch.className = "avatar-glitch";
      var initialsEl = document.createElement("span");
      initialsEl.className = "avatar-initials";
      initialsEl.textContent = initials(post.authorName);
      avatar.appendChild(glitch);
      avatar.appendChild(initialsEl);

      var identity = document.createElement("div");
      identity.className = "post-identity";
      var nameEl = document.createElement("span");
      nameEl.className = "post-author";
      nameEl.textContent = post.authorName;
      var timeEl = document.createElement("span");
      timeEl.className = "post-time";
      timeEl.textContent =
        formatRelativeTime(post.createdAt) +
        (post.updatedAt !== post.createdAt ? " · edited" : "");
      identity.appendChild(nameEl);
      identity.appendChild(timeEl);

      header.appendChild(avatar);
      header.appendChild(identity);

      if (post.authorId === "me") {
        var ownerActions = document.createElement("div");
        ownerActions.className = "post-owner-actions";

        var editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "icon-button";
        editBtn.setAttribute("aria-label", "Edit post");
        editBtn.innerHTML = '<span data-icon="edit"></span>';
        editBtn.addEventListener("click", function () {
          openEditDialog(post);
        });

        var deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "icon-button";
        deleteBtn.setAttribute("aria-label", "Delete post");
        deleteBtn.innerHTML = '<span data-icon="trash"></span>';
        deleteBtn.addEventListener("click", function () {
          deletePost(post.id);
        });

        ownerActions.appendChild(editBtn);
        ownerActions.appendChild(deleteBtn);
        header.appendChild(ownerActions);
      }

      contentHost.appendChild(header);

      var title = document.createElement("h3");
      title.className = "post-title";
      title.textContent = post.title;
      contentHost.appendChild(title);

      var bodyEl = document.createElement("p");
      bodyEl.className = "post-body";
      bodyEl.textContent = post.body;
      contentHost.appendChild(bodyEl);

      var media = buildMedia(post);
      if (media) contentHost.appendChild(media);

      if (post.hashtags.length > 0) {
        var tagRow = document.createElement("div");
        tagRow.className = "post-hashtags";
        post.hashtags.forEach(function (tag) {
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "hashtag-chip";
          chip.textContent = "#" + tag;
          chip.addEventListener("click", function () {
            setHashtagFilter(tag);
          });
          tagRow.appendChild(chip);
        });
        contentHost.appendChild(tagRow);
      }

      var actions = document.createElement("div");
      actions.className = "post-actions";

      var commentBtn = document.createElement("button");
      commentBtn.type = "button";
      commentBtn.className = "post-action-btn" + (expandedPostId === post.id ? " active" : "");
      commentBtn.innerHTML =
        '<span data-icon="comment"></span><span>' + post.comments.length + "</span>";
      commentBtn.addEventListener("click", function () {
        expandedPostId = expandedPostId === post.id ? null : post.id;
        replyTargetId = null;
        renderFeed();
      });

      var shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.className = "post-action-btn";
      shareBtn.innerHTML = '<span data-icon="share"></span><span>Share</span>';
      shareBtn.addEventListener("click", function () {
        CJ.showToast("Link copied.");
      });

      var repostBtn = document.createElement("button");
      repostBtn.type = "button";
      repostBtn.className = "post-action-btn";
      repostBtn.innerHTML =
        '<span data-icon="repost"></span><span>' + post.reposts + "</span>";
      repostBtn.addEventListener("click", function () {
        repost(post.id, myName);
      });

      actions.appendChild(commentBtn);
      actions.appendChild(shareBtn);
      actions.appendChild(repostBtn);
      contentHost.appendChild(actions);

      CJ.renderIcons(card);

      if (expandedPostId === post.id) {
        contentHost.appendChild(buildCommentPanel(post, myName));
      }

      return card;
    }

    function addComment(post, text, parentId, myName) {
      post.comments.push({
        id: CJ.generateId("comment"),
        authorId: "me",
        authorName: myName,
        text: text,
        timestamp: Date.now(),
        parentId: parentId || null,
      });
      var saved = persist();
      if (!saved) return false;
      replyTargetId = null;
      renderFeed();
      return true;
    }

    function buildComposer(placeholder, onSubmit) {
      var form = document.createElement("form");
      form.className = "post-comment-form";
      var input = document.createElement("input");
      input.type = "text";
      input.placeholder = placeholder;
      input.setAttribute("aria-label", placeholder);
      input.maxLength = 300;
      var submit = document.createElement("button");
      submit.type = "submit";
      submit.className = "button primary compact";
      submit.innerHTML = '<span data-icon="send"></span> SEND';
      form.appendChild(input);
      form.appendChild(submit);
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var text = input.value.trim();
        if (!text) return;
        onSubmit(text);
      });
      return form;
    }

    /* A comment tree with a connecting line down each reply branch —
       the "line tree" style, matching this app's bordered-panel look
       rather than chat-style arrows. */
    function buildCommentNode(comment, post, myName, byParent) {
      var node = document.createElement("div");
      node.className = "comment-node";

      var row = document.createElement("div");
      row.className = "post-comment";
      var author = document.createElement("span");
      author.className = "post-comment-author";
      author.textContent = comment.authorName;
      var text = document.createElement("span");
      text.className = "post-comment-text";
      text.textContent = comment.text;
      row.appendChild(author);
      row.appendChild(text);

      var replyBtn = document.createElement("button");
      replyBtn.type = "button";
      replyBtn.className = "comment-reply-btn";
      replyBtn.textContent = "Reply";
      replyBtn.addEventListener("click", function () {
        replyTargetId = replyTargetId === comment.id ? null : comment.id;
        renderFeed();
      });
      row.appendChild(replyBtn);

      node.appendChild(row);

      if (replyTargetId === comment.id) {
        var composer = buildComposer("Replying to " + comment.authorName + "…", function (text) {
          addComment(post, text, comment.id, myName);
        });
        composer.classList.add("comment-reply-form");
        node.appendChild(composer);
      }

      var children = byParent[comment.id];
      if (children && children.length > 0) {
        var childWrap = document.createElement("div");
        childWrap.className = "comment-children";
        children.forEach(function (child) {
          childWrap.appendChild(buildCommentNode(child, post, myName, byParent));
        });
        node.appendChild(childWrap);
      }

      return node;
    }

    function buildCommentPanel(post, myName) {
      var panel = document.createElement("div");
      panel.className = "post-comments";

      if (post.comments.length === 0) {
        var empty = document.createElement("p");
        empty.className = "list-empty-state";
        empty.textContent = "No comments yet.";
        panel.appendChild(empty);
      } else {
        var byParent = {};
        post.comments.forEach(function (c) {
          var key = c.parentId || "root";
          if (!byParent[key]) byParent[key] = [];
          byParent[key].push(c);
        });
        (byParent.root || []).forEach(function (comment) {
          panel.appendChild(buildCommentNode(comment, post, myName, byParent));
        });
      }

      var topComposer = buildComposer("Add a comment…", function (text) {
        addComment(post, text, null, myName);
      });
      panel.appendChild(topComposer);

      CJ.renderIcons(panel);
      return panel;
    }

    /* ---------- actions ---------- */

    /* Real up/down voting, like Reddit: clicking the arrow you already
       pressed clears your vote back to neutral; clicking the other one
       flips it, moving the score by 2. */
    function vote(id, direction) {
      var post = findPost(id);
      if (!post) return;

      if (post.voteState === direction) {
        post.score += direction === "up" ? -1 : 1;
        post.voteState = null;
      } else if (post.voteState === null) {
        post.score += direction === "up" ? 1 : -1;
        post.voteState = direction;
      } else {
        post.score += direction === "up" ? 2 : -2;
        post.voteState = direction;
      }

      persist();
      renderFeed();
    }

    function repost(id, myName) {
      var original = findPost(id);
      if (!original) return;
      var now = Date.now();
      posts.push({
        id: CJ.generateId("post"),
        authorId: "me",
        authorName: myName,
        tint: "cyan",
        title: original.title,
        body: original.body,
        hashtags: original.hashtags.slice(),
        media: original.media ? { type: original.media.type, url: original.media.url } : null,
        score: 0,
        voteState: null,
        reposts: 0,
        repostedFromId: original.id,
        createdAt: now,
        updatedAt: now,
        comments: [],
      });
      original.reposts += 1;
      var saved = persist();
      if (!saved) return;
      CJ.showToast("Reposted to your feed.");
      renderAll();
    }

    function deletePost(id) {
      var proceed = window.confirm("Delete this post? This cannot be undone.");
      if (!proceed) return;
      posts = posts.filter(function (p) {
        return p.id !== id;
      });
      var saved = persist();
      if (!saved) return;
      CJ.showToast("Post deleted.");
      renderAll();
    }

    /* ---------- create / edit dialog ---------- */

    function openNewDialog() {
      editingPostId = null;
      CJ.setText(dialogTitle, "New post.");
      titleInput.value = "";
      bodyInput.value = "";
      hashtagsInput.value = "";
      imageInput.value = "";
      CJ.setText(postError, "");
      dialog.showModal();
      titleInput.focus();
    }

    function openEditDialog(post) {
      editingPostId = post.id;
      CJ.setText(dialogTitle, "Edit post.");
      titleInput.value = post.title;
      bodyInput.value = post.body;
      hashtagsInput.value = post.hashtags.map(function (t) { return "#" + t; }).join(" ");
      imageInput.value = post.media && post.media.type === "image" ? post.media.url : "";
      CJ.setText(postError, "");
      dialog.showModal();
      titleInput.focus();
    }

    function closeDialog() {
      dialog.close();
    }

    newPostBtn.addEventListener("click", openNewDialog);
    closePostBtn.addEventListener("click", closeDialog);
    cancelPostBtn.addEventListener("click", closeDialog);

    postForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var title = titleInput.value.trim();
      var body = bodyInput.value.trim();
      if (!title || !body) {
        CJ.setText(postError, "Title and body are both required.");
        return;
      }
      CJ.setText(postError, "");
      var hashtags = parseHashtags(hashtagsInput.value);
      var imageUrl = imageInput.value.trim();
      var media = imageUrl ? { type: "image", url: imageUrl } : null;
      var now = Date.now();

      if (editingPostId) {
        var existing = findPost(editingPostId);
        existing.title = title;
        existing.body = body;
        existing.hashtags = hashtags;
        existing.media = media;
        existing.updatedAt = now;
      } else {
        posts.push({
          id: CJ.generateId("post"),
          authorId: "me",
          authorName: myName,
          tint: "cyan",
          title: title,
          body: body,
          hashtags: hashtags,
          media: media,
          score: 0,
          voteState: null,
          reposts: 0,
          repostedFromId: null,
          createdAt: now,
          updatedAt: now,
          comments: [],
        });
      }

      var saved = persist();
      if (!saved) {
        CJ.setText(postError, "Save failed — browser storage is unavailable.");
        return;
      }
      closeDialog();
      renderAll();
      CJ.showToast(editingPostId ? "Post updated." : "Post shared.");
    });

    renderAll();
  });
})();
