// Modernized XMLHttpRequest logic (CORS-friendly for Reddit API)

let output = '';
let style = 0;
let escapeNewLine = false;
let spaceComment = false;

document.addEventListener('DOMContentLoaded', () => {
  const urlField = document.getElementById('url-field');
  const exportBtn = document.getElementById('exportBtn');
  const outputDisplay = document.getElementById('outputDisplay');
  const outputBlock = document.getElementById('outputBlock');
  const downloadLink = document.getElementById('downloadLink');

  const queryUrl = new URLSearchParams(window.location.search).get('url');
  if (queryUrl) {
    urlField.value = queryUrl;
    startExport();
  }

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
  }

  function fetchRedditData(url) {
    output = '';

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${url}.json`);
    xhr.responseType = 'json';
    xhr.onload = () => {
      if (xhr.status !== 200) {
        alert('Failed to fetch Reddit post. Check the URL and try again.');
        return;
      }

      const data = xhr.response;
      const post = data[0].data.children[0].data;
      const comments = data[1].data.children;

      displayPost(post);
      output += '\n\n## Comments\n\n';
      comments.forEach(comment => displayComment(comment, comment.data.depth || 0));

      outputDisplay.textContent = output;
      outputBlock.hidden = false;

      const blob = new Blob([output], { type: 'text/plain' });
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = 'reddit-thread.md';
      downloadLink.classList.remove('disabled');
      downloadLink.hidden = false;
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
    const { body, author, ups, downs, replies } = comment.data;
    const indent = style === 0 ? '─'.repeat(depth) : '\t'.repeat(depth);
    const prefix = style === 0 ? (indent ? `├${indent} ` : '##### ') : (indent ? `${indent}- ` : '- ');

    if (body) {
      output += `${prefix}${formatComment(body)} ⏤ by *${author}* (↑ ${ups} / ↓ ${downs})\n`;
    } else {
      output += `${prefix}[deleted]\n`;
    }

    if (replies?.data?.children?.length) {
      replies.data.children.forEach(reply => displayComment(reply, depth + 1));
    }

    if (depth === 0 && spaceComment) output += '\n';
  }
});
