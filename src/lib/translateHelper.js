// Auto translate Indonesian to Japanese using MyMemory API (client-side, no server needed)

export async function translateToJapanese(text) {
  if (!text || text.trim() === "") return "";

  // Check if already mostly Japanese
  const jpChars = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
  if (jpChars > text.length * 0.3) {
    return text;
  }

  try {
    // MyMemory is free, no API key needed, works from client-side
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 500))}&langpair=id|ja&de=cv-portal@ijef.com`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText && data.responseData.match > 0.3) {
        return data.responseData.translatedText;
      }
    }
  } catch (err) {
    console.warn("MyMemory translation failed:", err.message);
  }

  // Fallback: try Google via CORS proxy or return original
  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=ja&dt=t&q=${encodeURIComponent(text.substring(0, 1000))}`;
    const res = await fetch(googleUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map((s) => s[0]).join("");
      }
    }
  } catch (err) {
    console.warn("Google translate fallback failed:", err.message);
  }

  return text;
}

// Batch translate multiple fields
export async function batchTranslate(fields, onProgress) {
  const results = {};
  const keys = Object.keys(fields);
  let done = 0;

  for (const key of keys) {
    const value = fields[key];
    if (value && value.trim()) {
      results[key] = await translateToJapanese(value);
      done++;
      if (onProgress) onProgress(done, keys.length);
      // Delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    } else {
      results[key] = "";
      done++;
    }
  }
  return results;
}
