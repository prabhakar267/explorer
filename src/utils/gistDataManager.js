const ACCESS_CODES = {
  "nybbtbouv123": {
    gistId: "05bc3de9d00ceaf8d9505ec513a57ccd",
    gistUrl: "https://api.github.com/gists/05bc3de9d00ceaf8d9505ec513a57ccd",
  },
};

function rot13(text) {
  return text.split('').map((char) => {
    if (char.match(/[a-z]/i)) {
      const code = char.charCodeAt(0);
      const base = code >= 65 && code <= 90 ? 65 : 97;
      return String.fromCharCode(((code - base + 13) % 26) + base);
    }
    return char;
  }).join('');
}

export async function loadGistData() {
  const savedCode = localStorage.getItem('unescoAccessCode');
  if (!savedCode) return [];

  const obfuscated = rot13(savedCode.toLowerCase());
  const config = ACCESS_CODES[obfuscated];
  if (!config) return [];

  try {
    const response = await fetch(config.gistUrl);
    if (!response.ok) return [];

    const gistData = await response.json();
    let dataContent = null;

    for (const filename in gistData.files) {
      if (filename.toLowerCase().includes('data') && filename.toLowerCase().includes('.json')) {
        dataContent = gistData.files[filename].content;
        break;
      }
    }

    if (!dataContent) {
      for (const filename in gistData.files) {
        if (filename.toLowerCase().endsWith('.json')) {
          dataContent = gistData.files[filename].content;
          break;
        }
      }
    }

    if (!dataContent) return [];

    const parsed = JSON.parse(dataContent);
    return parsed?.visitedSites || [];
  } catch {
    return [];
  }
}

export function showAccessCodeDialog() {
  const code = prompt('Enter access code to sync with GitHub Gist:');
  if (!code) return;

  const obfuscated = rot13(code.toLowerCase());
  if (ACCESS_CODES[obfuscated]) {
    localStorage.setItem('unescoAccessCode', code);
    alert('Access code accepted! Reload the page to sync data.');
  } else {
    alert('Invalid access code. Please try again.');
  }
}

export function downloadData() {
  const visitedSites = JSON.parse(localStorage.getItem('visitedUNESCOSites') || '[]');
  const data = {
    visitedSites,
    theme: localStorage.getItem('theme') || 'system',
    lastUpdated: new Date().toISOString(),
    totalSites: visitedSites.length,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `unesco-explorer-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
