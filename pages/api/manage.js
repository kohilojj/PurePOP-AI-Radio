// pages/api/manage.js
export const config = {
  api: { bodyParser: { sizeLimit: '40mb' } },
};

export default async function handler(req, res) {
  const { method } = req;
  const { fileName, content, path, sha } = req.body;

  // TÄMÄ ON SINUN AVAIMESI
  const GITHUB_TOKEN = "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"; 
  const REPO_OWNER = "kohilojj";
  const REPO_NAME = "purepop-ai-commander";

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.v3+json'
  };

  try {
    if (method === 'POST') {
      const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/music/${fileName}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Lisätty biisi: ${fileName}`,
          content: content.split(',')[1],
        }),
      });
      if (response.ok) return res.status(200).json({ ok: true });
      else return res.status(500).json({ error: "GitHub hylkäsi latauksen" });
    }
    
    if (method === 'DELETE') {
      const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          message: `Poistettu biisi: ${path}`,
          sha: sha
        }),
      });
      return response.ok ? res.status(200).json({ ok: true }) : res.status(500).json({ error: "Poisto epäonnistui" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
