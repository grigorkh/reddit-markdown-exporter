let output = '';
let style = 0;
let escapeNewLine = false;
let spaceComment = false;
let excludeDeleted = false;

document.addEventListener('DOMContentLoaded', () => {
  const urlField = document.getElementById('url-field');
  const exportBtn = document.getElementById('exportBtn');
  const outputDisplay = document.getElementById('outputDisplay');
  const outputContainer = document.getElementById('outputContainer');
  const downloadLink = document.getElementById('downloadLink');

  exportBtn.addEventListener('click', startExport);

  function startExport() {
    const url = urlField.value.trim();
    if (!url) {
      alert('Please enter a valid Reddit post URL');
      return;
    }

    setOptions();
    fetchRedditData(url);
  }

  function setOptions() {
    style = document.querySelector('input[name="exportStyle"]:checked').value === 'tree' ? 0 : 1;
    escapeNewLine = document.getElementById('escapeNewLine').checked;
    spaceComment = document.getElementById('spaceComment').checked;
    excludeDeleted = document.getElementById('excludeDeleted').checked;
  }

  function fetchRedditData(url) {
    output = '';
    outputContainer.style.display = "none";

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${url}.json`);
    xhr.responseType = 'json';

    xhr.onload = () => {
      try {
        if (xhr.status !== 200) {
          alert('Failed to fetch Reddit post. Check the URL and try again.');
          return;
        }

        const data = xhr.response;
        const post = data[0]?.data?.children?.[0]?.data;
        const comments = data[1]?.data?.children || [];

        if (!post) {
          alert('Could not find post data.');
          return;
        }

        displayPost(post);
        output += '\n\n## Comments\n\n';

        let commentCount = 0;
        comments.forEach(comment => {
          if (comment.kind === "t1") {
            try {
              displayComment(comment, comment.data?.depth || 0);
              commentCount++;
            } catch (e) {
              console.warn('Skipping comment due to error:', comment, e);
            }
          }
        });

        outputDisplay.textContent = output;
        outputContainer.style.display = "flex";

        document.getElementById("summaryTitle").textContent = post.title;
        document.getElementById("summaryAuthor").textContent = post.author;
        document.getElementById("summaryUps").textContent = post.ups;
        document.getElementById("summaryComments").textContent = commentCount;
        document.getElementById("summaryPermalink").href = "https://reddit.com" + post.permalink;

        const blob = new Blob([output], { type: 'text/plain' });
        const safeTitle = post.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50);
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${safeTitle || 'reddit_thread'}.md`;
        downloadLink.classList.remove('hidden');
        downloadLink.hidden = false;
      } catch (err) {
        alert('Something went wrong while processing the Reddit data.');
        console.error('Processing error:', err);
      }
    };

    xhr.onerror = () => alert('Network error occurred while fetching the Reddit post.');
    xhr.send();
  }

  function displayPost(post) {
    output += `# ${post.title}\n`;
    if (post.selftext) {
      output += `\n${post.selftext}\n`;
    }
    output += `\n[permalink](https://reddit.com${post.permalink})`;
    output += `\nby *${post.author}* (↑ ${post.ups} / ↓ ${post.downs})`;
  }

  function formatComment(text) {
    return escapeNewLine ? text.replace(/(\r\n|\n|\r)/gm, '') : text;
  }

  function displayComment(comment, depth) {
    const { body, author, ups, downs, replies } = comment.data || {};
    if (!body || (excludeDeleted && author === "[deleted]")) return;

    const indent = style === 0 ? '─'.repeat(depth) : '\t'.repeat(depth);
    const prefix = style === 0 ? (indent ? `├${indent} ` : '##### ') : (indent ? `${indent}- ` : '- ');
    output += `${prefix}${formatComment(body)} ⏤ by *${author}* (↑ ${ups} / ↓ ${downs})\n`;

    if (replies?.data?.children?.length) {
      replies.data.children.forEach(reply => displayComment(reply, depth + 1));
    }

    if (depth === 0 && spaceComment) output += '\n';
  }

  document.getElementById("copyButton").addEventListener("click", () => {
    const output = document.getElementById("outputDisplay").textContent;
    navigator.clipboard.writeText(output).then(() => {
      const btn = document.getElementById("copyButton");
      btn.textContent = "✅";
      setTimeout(() => (btn.textContent = "📋"), 1500);
    });
  });
});
