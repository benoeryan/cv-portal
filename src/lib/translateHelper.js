// Auto translate Indonesian to Japanese and vice versa with custom CV dictionary refinement

const CV_TERMS_DICTIONARY = {
  // Indonesian word / Literal Japanese -> Natural Japanese Resume Kanji & terminology
  "ケアギバー": "介護職", // Direct Katakana to proper Japanese caregiving job title
  "介護士": "介護職", // Proper job title for caregiver
  "介護職員": "介護職",
  "介護援助者": "介護職",
  "介護者": "介護職", // Often translates to family caregiver; "介護職" is proper for jobs
  "実習生": "技能実習生", // Proper technical intern term
  "元実習生": "元技能実習生",
  "研修生": "技能実習生",
  "元研修生": "元技能実習生",
  "技術実習": "技能実習",
  "インターンシップ": "技能実習",
  "インターン": "技能実習",
  "実習": "技能実習",
  "自己宣伝": "自己PR", // self promotion
  "自己アピール": "自己PR",
  "長所（kelebihan）": "長所",
  "短所（kekurangan）": "短所",
  "利点": "長所", // strength/advantage -> resume standard "長所"
  "強み": "長所",
  "利便性": "長所",
  "弱点": "短所", // weakness -> resume standard "短所"
  "欠点": "短所",
  "欠陥": "短所",
  "日本に行く理由": "来日理由", // Reasons to go to Japan
  "日本への旅の理由": "来日理由",
  "日本に行くための理由": "来日理由",
  "申請の理由": "志望動機", // Reasons for applying
  "適用理由": "志望動機",
  "志望理由": "志望動機", // "志望動機" contains the motivation and is standard on Japanese CVs
  "将来の希望": "将来の夢", // Future dream
  "未来の夢": "将来の夢",
  "コメ新参者": "ニューカマー", // newcomer literal
  "新しいコマー": "ニューカマー",
  "新しい来手": "ニューカマー",
  "ニューカマー": "ニューカマー",
  "新しい人": "ニューカマー",
  "土木建設": "建設土木", // Civil engineering/construction
  "牛の繁殖": "畜産業", // animal husbandry
  "豚 di 飼育": "畜産業",
  "豚の飼育": "畜産業",
  "農業の仕事": "農業",
  "栽培": "農業",
  "介護の仕事": "介護",
  "介護サービス": "介護",
};

// Refine Japanese translation using CV-specific terminology dictionary to optimize Kanji accuracy
export function refineJapaneseTranslation(text) {
  if (!text) return "";
  let refined = text;
  for (const [key, replacement] of Object.entries(CV_TERMS_DICTIONARY)) {
    // Replace exact occurrences
    const regex = new RegExp(key, "g");
    refined = refined.replace(regex, replacement);
  }
  return refined;
}

export async function translateToJapanese(text) {
  if (!text || text.trim() === "") return "";

  // Check if already mostly Japanese
  const jpChars = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
  if (jpChars > text.length * 0.3) {
    return refineJapaneseTranslation(text);
  }

  // 1. Google Translate (Mobile client/GTx free API) is highly accurate for Indonesian <-> Japanese
  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=ja&dt=t&q=${encodeURIComponent(text.substring(0, 1000))}`;
    const res = await fetch(googleUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const translated = data[0].map((s) => s[0]).join("");
        if (translated && translated.trim() !== "") {
          return refineJapaneseTranslation(translated);
        }
      }
    }
  } catch (err) {
    console.warn("Google translate to Japanese failed:", err.message);
  }

  // 2. Fallback: try MyMemory
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 500))}&langpair=id|ja&de=cv-portal@ijef.com`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText && data.responseData.match > 0.3) {
        return refineJapaneseTranslation(data.responseData.translatedText);
      }
    }
  } catch (err) {
    console.warn("MyMemory translation failed:", err.message);
  }

  return text;
}

// Translate Japanese back to Indonesian
export async function translateToIndonesian(text) {
  if (!text || text.trim() === "") return "";

  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=id&dt=t&q=${encodeURIComponent(text.substring(0, 1000))}`;
    const res = await fetch(googleUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map((s) => s[0]).join("");
      }
    }
  } catch (err) {
    console.warn("Google translate to Indonesian failed:", err.message);
  }

  // Fallback: try MyMemory
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 500))}&langpair=ja|id&de=cv-portal@ijef.com`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText && data.responseData.match > 0.3) {
        return data.responseData.translatedText;
      }
    }
  } catch (err) {
    console.warn("MyMemory translate to Indonesian failed:", err.message);
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
