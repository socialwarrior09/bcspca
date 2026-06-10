const faqButtons = document.querySelectorAll(".faq-question");
const storyTrack = document.querySelector("[data-story-track]");
const storyPrevButton = document.querySelector("[data-story-prev]");
const storyNextButton = document.querySelector("[data-story-next]");
const heroTrack = document.querySelector("[data-hero-track]");
const heroDots = document.querySelectorAll("[data-hero-dot]");

const socialCountsStorageKey = "leadership12CommentSocialCounts";
const repliesStorageKey = "leadership12CommentReplies";
const shareButtons = document.querySelectorAll("[data-share-button]");
const petHearts = document.querySelectorAll(".pet-heart");

function getSectionName(element) {
  const section = element.closest("section, header, footer");
  if (!section) return "Page";
  if (section.id) return section.id;
  if (section.classList.length > 0) return section.classList[0];
  return section.tagName.toLowerCase();
}

function getClickLabel(element) {
  const label = element.getAttribute("aria-label") || element.textContent || element.getAttribute("title") || "Unnamed click";
  return label.replace(/\s+/g, " ").trim();
}

function trackEvent(eventName, properties = {}) {
  if (!window.mixpanel || typeof window.mixpanel.track !== "function") return;

  window.mixpanel.track(eventName, {
    page_title: document.title,
    page_path: window.location.pathname,
    page_hash: window.location.hash,
    ...properties,
  });
}

trackEvent("Website Loaded", {
  tracking_version: "mixpanel-header-snippet-v1",
});

trackEvent("Page Viewed", {
  tracking_version: "mixpanel-header-snippet-v1",
});

document.addEventListener("click", (event) => {
  const clickable = event.target.closest("a, button, [role='button']");
  if (!clickable) return;

  const destination = clickable.getAttribute("href") || clickable.dataset.shareUrl || "";

  trackEvent("Button Clicked", {
    button_text: getClickLabel(clickable),
    section: getSectionName(clickable),
    element_type: clickable.tagName.toLowerCase(),
    destination,
    is_external: /^https?:\/\//.test(destination),
    classes: clickable.className || "",
  });

  if (clickable.dataset.trackButton) {
    trackEvent("Student Help CTA Clicked", {
      cta_name: clickable.dataset.trackButton,
      cta_group: clickable.dataset.trackGroup || getSectionName(clickable),
      destination,
    });
  }
});

if ("IntersectionObserver" in window) {
  const viewedSections = new Set();
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const section = entry.target;
        const sectionName = section.id || section.classList[0] || section.tagName.toLowerCase();

        if (viewedSections.has(sectionName)) return;

        viewedSections.add(sectionName);
        trackEvent("Section Viewed", {
          section: sectionName,
          heading: section.querySelector("h1, h2")?.textContent?.trim() || sectionName,
        });
      });
    },
    { threshold: 0.45 }
  );

  document.querySelectorAll("header, section, footer").forEach((section) => sectionObserver.observe(section));
}

faqButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const faqItem = button.closest(".faq-item");
    const isOpen = faqItem.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
});

petHearts.forEach((heart) => {
  heart.setAttribute("role", "button");
  heart.setAttribute("tabindex", "0");
  heart.setAttribute("aria-label", "Save this pet");
  heart.setAttribute("aria-pressed", "false");

  function toggleHeart(event) {
    event.preventDefault();
    event.stopPropagation();
    const isSaved = heart.classList.toggle("is-saved");
    heart.setAttribute("aria-pressed", String(isSaved));
    heart.textContent = isSaved ? "♥" : "♡";
    trackEvent("Pet Heart Toggled", {
      pet_name: heart.closest(".pet-card")?.querySelector("h3")?.textContent?.trim() || "Unknown pet",
      saved: isSaved,
      section: getSectionName(heart),
    });
  }

  heart.addEventListener("click", toggleHeart);
  heart.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      toggleHeart(event);
    }
  });
});

function readJsonFromStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

const socialCounts = readJsonFromStorage(socialCountsStorageKey, {});
const savedReplies = readJsonFromStorage(repliesStorageKey, {});

function getSocialCount(commentId, action, baseValue) {
  return baseValue + (socialCounts[commentId]?.[action] || 0);
}

function saveSocialCounts() {
  localStorage.setItem(socialCountsStorageKey, JSON.stringify(socialCounts));
}

function showSavedReply(commentId, text, commentContent) {
  let savedReply = commentContent.querySelector(".saved-reply");

  if (!savedReply) {
    savedReply = document.createElement("p");
    savedReply.className = "saved-reply";
    commentContent.append(savedReply);
  }

  savedReply.textContent = `Your reply: ${text}`;
}

function openReplyBox(commentId, commentContent) {
  const existingReplyBox = commentContent.querySelector(".reply-box");

  if (existingReplyBox) {
    existingReplyBox.querySelector("textarea")?.focus();
    return;
  }

  const replyBox = document.createElement("form");
  replyBox.className = "reply-box";
  replyBox.innerHTML = `
    <label class="sr-only" for="reply-${commentId}">Reply to this comment</label>
    <textarea id="reply-${commentId}" rows="2" placeholder="Write a quick reply..."></textarea>
    <div class="reply-actions">
      <button class="button primary" type="submit">Post Reply</button>
      <button class="button secondary cancel-reply" type="button">Cancel</button>
    </div>
  `;

  commentContent.append(replyBox);
  const replyInput = replyBox.querySelector("textarea");
  replyInput.focus();

  replyBox.addEventListener("submit", (event) => {
    event.preventDefault();
    const replyText = replyInput.value.trim();

    if (!replyText) {
      replyInput.focus();
      return;
    }

    savedReplies[commentId] = replyText;
    localStorage.setItem(repliesStorageKey, JSON.stringify(savedReplies));
    showSavedReply(commentId, replyText, commentContent);
    replyBox.remove();
  });

  replyBox.querySelector(".cancel-reply").addEventListener("click", () => {
    replyBox.remove();
  });
}

function buildSocialButton(commentId, action, label, baseValue) {
  const button = document.createElement("button");
  button.className = `comment-action-button social-${action}`;
  button.type = "button";
  button.dataset.commentId = commentId;
  button.dataset.action = action;
  button.dataset.baseValue = String(baseValue);
  button.innerHTML = `<span>${label}</span> <strong>${getSocialCount(commentId, action, baseValue)}</strong>`;
  return button;
}

function updateSocialButton(button) {
  const { commentId, action } = button.dataset;
  const baseValue = Number(button.dataset.baseValue || 0);
  const label = button.querySelector("span")?.textContent || action;
  const total = getSocialCount(commentId, action, baseValue);
  button.innerHTML = `<span>${label}</span> <strong>${total}</strong>`;
}

function initializeSocialActions() {
  document.querySelectorAll(".comment-actions").forEach((actions) => {
    const existingLikeButton = actions.querySelector(".like-button");
    const existingReplyButton = actions.querySelector(".reply-button");
    const commentId = existingLikeButton?.dataset.commentId || existingReplyButton?.dataset.commentId;
    const baseLikes = Number(existingLikeButton?.dataset.baseLikes || 0);
    const commentContent = actions.closest(".comment-content");

    if (!commentId || !commentContent) return;

    actions.replaceChildren(
      buildSocialButton(commentId, "like", "Like", baseLikes),
      buildSocialButton(commentId, "comment", "Comment", 0),
      buildSocialButton(commentId, "share", "Share", 0)
    );

    if (savedReplies[commentId]) {
      showSavedReply(commentId, savedReplies[commentId], commentContent);
    }

    actions.querySelectorAll(".comment-action-button").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        socialCounts[commentId] = socialCounts[commentId] || {};
        socialCounts[commentId][action] = (socialCounts[commentId][action] || 0) + 1;
        saveSocialCounts();
        updateSocialButton(button);

        if (action === "comment") {
          openReplyBox(commentId, commentContent);
        }
      });
    });
  });
}

initializeSocialActions();

shareButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const sharePanel = button.closest(".linus-share");
    const shareMenu = sharePanel?.querySelector(".share-menu");
    const shareStatus = sharePanel?.querySelector(".share-status");
    const isOpen = shareMenu ? !shareMenu.hidden : false;

    if (!shareMenu) return;

    shareMenu.hidden = isOpen;
    button.setAttribute("aria-expanded", String(!isOpen));
    if (shareStatus) shareStatus.textContent = isOpen ? "" : "Choose where to share Linus's profile.";
  });
});

document.querySelectorAll("[data-copy-share-link]").forEach((button) => {
  button.addEventListener("click", async () => {
    const sharePanel = button.closest(".linus-share");
    const shareStatus = sharePanel?.querySelector(".share-status");
    const shareUrl = button.dataset.shareUrl;

    try {
      await navigator.clipboard.writeText(shareUrl);
      if (shareStatus) shareStatus.textContent = "Link copied. You can paste it into a chat, story, or post.";
    } catch {
      if (shareStatus) shareStatus.textContent = shareUrl;
    }
  });
});

if (storyTrack) {
  const storyCards = Array.from(storyTrack.querySelectorAll(".story-card"));
  let storyIndex = 0;
  let storyTimer;

  function visibleStoryCount() {
    if (window.matchMedia("(max-width: 680px)").matches) return 1;
    if (window.matchMedia("(max-width: 980px)").matches) return 2;
    return 3;
  }

  function updateStoryCarousel() {
    const card = storyCards[0];
    if (!card) return;

    const cardWidth = card.getBoundingClientRect().width;
    const trackGap = Number.parseFloat(getComputedStyle(storyTrack).columnGap || "0");
    storyTrack.style.transform = `translateX(-${storyIndex * (cardWidth + trackGap)}px)`;
  }

  function moveStoryCarousel(direction) {
    const maxIndex = Math.max(0, storyCards.length - visibleStoryCount());
    storyIndex = storyIndex + direction;

    if (storyIndex > maxIndex) storyIndex = 0;
    if (storyIndex < 0) storyIndex = maxIndex;

    updateStoryCarousel();
  }

  function startStoryCarousel() {
    window.clearInterval(storyTimer);
    storyTimer = window.setInterval(() => moveStoryCarousel(1), 4500);
  }

  storyNextButton?.addEventListener("click", () => {
    moveStoryCarousel(1);
    startStoryCarousel();
  });

  storyPrevButton?.addEventListener("click", () => {
    moveStoryCarousel(-1);
    startStoryCarousel();
  });

  storyTrack.addEventListener("mouseenter", () => window.clearInterval(storyTimer));
  storyTrack.addEventListener("mouseleave", startStoryCarousel);
  window.addEventListener("resize", () => {
    storyIndex = Math.min(storyIndex, Math.max(0, storyCards.length - visibleStoryCount()));
    updateStoryCarousel();
  });

  updateStoryCarousel();
  startStoryCarousel();
}

if (heroTrack) {
  const heroSlides = Array.from(heroTrack.querySelectorAll("img"));
  let heroIndex = 0;
  let heroTimer;

  function updateHeroCarousel() {
    heroTrack.style.transform = `translateX(-${heroIndex * 100}%)`;
    heroDots.forEach((dot, index) => {
      dot.setAttribute("aria-current", String(index === heroIndex));
    });
  }

  function moveHeroCarousel(index) {
    heroIndex = (index + heroSlides.length) % heroSlides.length;
    updateHeroCarousel();
  }

  function startHeroCarousel() {
    window.clearInterval(heroTimer);
    heroTimer = window.setInterval(() => moveHeroCarousel(heroIndex + 1), 3600);
  }

  heroDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      moveHeroCarousel(Number(dot.dataset.heroDot));
      startHeroCarousel();
    });
  });

  heroTrack.addEventListener("mouseenter", () => window.clearInterval(heroTimer));
  heroTrack.addEventListener("mouseleave", startHeroCarousel);
  updateHeroCarousel();
  startHeroCarousel();
}
