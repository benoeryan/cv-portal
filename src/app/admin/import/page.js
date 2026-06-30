"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";

const SPREADSHEET_ID = "1ZBpJyZasfXfWGZY1F88wddtIEQpzCkF1tRbDJoappqY";
const SHEET_OPTIONS = ["Form Responses 3", "Responses 1", "Form Responses 1", "Form_Responses3"];
const API_KEY = "AIzaSyAWlNi_iBOWxZBD6E20aHOSrRpPsirDdOM"; // Reuse Firebase API key (enable Sheets API in GCP)

// Normalize header: trim, collapse spaces, lowercase
function normalizeHeader(h) {
  if (!h) return "";
  return h
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[.:;]+/g, "")
    .replace(/\s*:\s*/g, " : ");
}

// Simple similarity score (Dice coefficient on bigrams)
function similarity(a, b) {
  if (!a || !b) return 0;
  const na = a.toLowerCase().replace(/\s+/g, "");
  const nb = b.toLowerCase().replace(/\s+/g, "");
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const bigramsA = new Set();
  for (let i = 0; i < na.length - 1; i++) bigramsA.add(na.substring(i, i + 2));
  let matches = 0;
  for (let i = 0; i < nb.length - 1; i++) {
    if (bigramsA.has(nb.substring(i, i + 2))) matches++;
  }
  return (2 * matches) / (na.length - 1 + nb.length - 1);
}

// Analyze header mapping and return mapping info
function analyzeHeaderMapping(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const fieldDefinitions = getFieldDefinitions();
  const matched = [];
  const unmatched = [];

  for (let i = 0; i < headers.length; i++) {
    if (!headers[i] || !headers[i].trim()) continue;
    const nh = normalizedHeaders[i];
    let foundField = null;

    for (const [fieldName, keywords] of Object.entries(fieldDefinitions)) {
      for (const keyword of keywords) {
        const nk = normalizeHeader(keyword);
        // Exact substring match
        if (nh.includes(nk) || nk.includes(nh)) {
          foundField = fieldName;
          break;
        }
        // Fuzzy match with high threshold
        if (similarity(nh, nk) > 0.7) {
          foundField = fieldName;
          break;
        }
      }
      if (foundField) break;
    }

    if (foundField) {
      matched.push({ header: headers[i], field: foundField, index: i });
    } else {
      // Skip timestamp column from unmatched
      if (nh.includes("timestamp") || nh.includes("cap waktu")) continue;
      unmatched.push({ header: headers[i], index: i });
    }
  }

  return { matched, unmatched };
}

// All field definitions with multiple keyword alternatives
function getFieldDefinitions() {
  return {
    "Kode Referensi": ["kode referensi", "referensi"],
    "Kode Job": ["kode job", "kode pekerjaan"],
    "Kategori Kandidat": ["kategori kandidat", "kandidat", "kategori"],
    "Domisili": ["domisili", "kota domisili", "kota tinggal"],
    "Nama Lengkap": ["nama lengkap", "nama lengkap sesuai paspor", "nama sesuai paspor", "nama lengkap anda"],
    "Nama Panggilan": ["nama panggilan", "panggilan"],
    "Bidang Kerja": ["bidang kerja yang dipilih", "bidang ssw yang dilamar", "bidang tg yang dilamar", "bidang kerja", "bidang ssw", "bidang yang dilamar", "bidang"],
    "No HP": ["no. hp aktif", "no hp aktif", "no telp aktif", "no telp", "no hp", "nomor hp", "no. telp", "nomor telepon", "nomor hp aktif", "nomer hp"],
    "Email": ["alamat email", "email", "e-mail", "alamat e-mail"],
    "Tanggal Lahir": ["tanggal lahir", "tangga lahir", "tgl lahir", "tgl. lahir", "tanggallahir"],
    "Tempat Lahir": ["tempat lahir", "kota lahir"],
    "Alamat Lengkap": ["alamat lengkap", "alamat lengkap sesuai ktp", "alamat ktp", "alamat rumah", "alamat"],
    "Jenis Kelamin": ["jenis kelamin", "kelamin", "gender"],
    "Agama": ["agama"],
    "Golongan Darah": ["golongan darah", "gol darah", "gol. darah"],
    "Tinggi Badan": ["tinggi badan", "tinggi", "tb"],
    "Berat Badan": ["berat badan", "berat", "bb"],
    "Dominan Tangan": ["dominan tangan", "tangan dominan"],
    "Buta Warna": ["buta warna"],
    "Merokok": ["apakah anda merokok", "merokok", "anda merokok"],
    "Minum Alkohol": ["apakah anda minum alkohol", "minum alkohol", "alkohol"],
    "Tato": ["apakah memiliki tato", "bertato", "tato", "memiliki tato"],
    "Penyakit Berat": ["apakah memiliki penyakit berat", "apakah punya penyakit berat", "penyakit berat", "riwayat penyakit"],
    "Alergi": ["apakah memiliki alergi", "apakah punya alergi", "alergi"],
    "Hobi": ["hobi", "hobby"],
    "Status Pernikahan": ["status pernikahan", "status menikah", "pernikahan"],
    "Pernah ke Jepang": ["apakah pernah ke jepang", "pernah ke jepang"],
    "Memiliki Paspor": ["apakah memiliki paspor", "memiliki paspor", "paspor"],
    "Nomor Paspor": ["nomor paspor", "no paspor", "no. paspor"],
    "Masa Berlaku Paspor": ["masa berlaku paspor", "berlaku paspor", "expired paspor"],
    "Memiliki SIM": ["apakah memiliki sim", "memiliki sim", "sim"],
    "Pas Photo": ["pas photo 3x4", "pas foto", "pas photo", "photo", "foto 3x4", "pas foto 3x4"],
    "Sertifikat Bahasa Jepang": ["sertifikat bahasa jepang", "sertifikat jlpt", "sertifikat nat"],
    "Video JFT": ["video screen recording jft", "video jft", "screen recording jft"],
    "Sertifikat SSW": ["sertifikat ssw", "sertifikat ssw / senmonkyu", "sertifikat ssw/senmonkyu"],
    "Video SSW": ["video screen recording ssw", "video ssw", "screen recording ssw"],
    "CV/Rirekisho": ["cv/rirekisho", "cv/rirekisho format bebas", "rirekisho", "cv"],
    "Sertifikat Senmonkyuu": ["sertifikat senmonkyuu", "senmonkyuu/hyoukachosho", "senmonkyuu", "hyoukachosho"],
    "Sertifikat Selesai Magang": ["sertifikat selesai magang", "selesai magang"],
    "Promosi Diri": ["promosikan diri anda", "promosi diri anda", "promosi diri"],
    "Kelebihan": ["kelebihan anda", "kelebihan"],
    "Kekurangan": ["kekurangan anda", "kekurangan"],
    "Alasan ke Jepang": ["alasan ingin ke jepang", "alasan ingin pergi ke jepang", "alasan ke jepang"],
    "Alasan Melamar Bidang": ["alasan ingin melamar ke bidang ini", "alasan melamar job di bidang ini", "alasan melamar bidang"],
    "Alasan Kaigofukushishi": ["alasan ingin menjadi kaigofukushishi", "alasan ingin menjadi kaigo fukushishi", "kaigofukushishi"],
    "Impian Masa Depan": ["impian di masa depan", "impian masa depan", "impian"],
    "Lama Tinggal Jepang": ["lama ingin tinggal di jepang", "lama tinggal di jepang"],
    "Lama Belajar Bahasa Jepang": ["lama belajar bahasa jepang", "durasi belajar bahasa jepang", "belajar bahasa jepang"],
    "Nomor Darurat": ["nomor darurat : no hp", "no telp darurat", "nomor darurat", "no hp darurat"],
    "Nama Pemilik Darurat": ["nomor darurat : nama lengkap pemilik nomor hp", "nama lengkap pemilik nomor darurat", "nama pemilik nomor darurat", "nama kontak darurat"],
    "Hubungan Darurat": ["nomor darurat : hubungan dengan pelamar", "hubungan dengan pelamar", "hubungan darurat"],
  };
}

// Parse multi-line education text into structured fields
// Each line format: "masuk - nama_sekolah - lulus" (e.g. "07/2005 - SD MELONG MANDIRI 4 - 06/2011")
function parseMultilineEducation(text) {
  if (!text || typeof text !== "string") return {};
  const lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l && l !== "-");
  const result = {};

  const SD_KEYWORDS = ["SDIT", "SDN", "SDS", "SDI", "SD", "MIN", "MI"];
  const SMP_KEYWORDS = ["SMP", "MTS", "MTSN"];
  const SMA_KEYWORDS = ["SMA", "SMK", "SMKN", "SMAN", "MA", "MAN", "MAK"];
  const UNIV_KEYWORDS = ["UNIVERSITAS", "UNIV", "POLITEKNIK", "AKADEMI", "STIKES", "INSTITUT", "SEKOLAH TINGGI", "STT", "STMIK", "STTD"];

  // Check if a school name starts with a keyword followed by a space, digit, or is the keyword exactly
  function matchesKeyword(upper, kw) {
    if (upper === kw) return true;
    if (upper.startsWith(kw + " ") || upper.startsWith(kw + ".")) return true;
    // Check if keyword appears at start followed by a digit (e.g. "SDN4")
    if (upper.startsWith(kw) && upper.length > kw.length && /\d/.test(upper[kw.length])) return true;
    return false;
  }

  function detectLevel(nama) {
    const upper = nama.toUpperCase().trim();
    for (const kw of UNIV_KEYWORDS) {
      if (upper.includes(kw)) return "univ";
    }
    for (const kw of SMA_KEYWORDS) {
      if (upper.includes(kw)) return "sma";
    }
    for (const kw of SMP_KEYWORDS) {
      if (upper.includes(kw)) return "smp";
    }
    for (const kw of SD_KEYWORDS) {
      if (matchesKeyword(upper, kw)) return "sd";
    }
    return null;
  }

  const parsed = [];
  for (const line of lines) {
    // Remove leading "- " prefix
    const cleanLine = line.replace(/^-\s*/, "").trim();
    if (!cleanLine) continue;
    // Split by " - " (literal space-dash-space) separator to avoid splitting embedded hyphens in names
    const parts = cleanLine.split(" - ");
    if (parts.length >= 2) {
      // Format: masuk - nama_sekolah - lulus OR nama_sekolah - masuk - lulus
      // Try to detect: if first part looks like a date (MM/YYYY or YYYY), treat as masuk - nama - lulus
      const firstIsDate = /^\d{2}\/\d{4}$/.test(parts[0].trim()) || /^\d{4}$/.test(parts[0].trim());
      if (firstIsDate && parts.length >= 2) {
        const masuk = parts[0].trim();
        // Rejoin middle parts as nama (in case nama contains " - " internally)
        const lulus = parts.length >= 3 && (/^\d{2}\/\d{4}$/.test(parts[parts.length - 1].trim()) || /^\d{4}$/.test(parts[parts.length - 1].trim()))
          ? parts[parts.length - 1].trim()
          : "";
        const namaEnd = lulus ? parts.length - 1 : parts.length;
        const nama = parts.slice(1, namaEnd).join(" - ").trim();
        parsed.push({ masuk, nama, lulus });
      } else {
        // Fallback: treat first part as nama
        const nama = parts[0].trim();
        const masuk = parts.length >= 2 ? parts[1].trim() : "";
        const lulus = parts.length >= 3 ? parts[2].trim() : "";
        parsed.push({ masuk, nama, lulus });
      }
    } else {
      // Single part - treat as nama
      parsed.push({ masuk: "", nama: cleanLine, lulus: "" });
    }
  }

  // Assign to levels by keyword detection first
  const assigned = { sd: null, smp: null, sma: null, univ: null };
  const unassigned = [];

  for (const entry of parsed) {
    const level = detectLevel(entry.nama);
    if (level && !assigned[level]) {
      assigned[level] = entry;
    } else {
      unassigned.push(entry);
    }
  }

  // Fill remaining by order (1st=SD, 2nd=SMP, 3rd=SMA, 4th=UNIV)
  const orderLevels = ["sd", "smp", "sma", "univ"];
  let unassignedIdx = 0;
  for (const level of orderLevels) {
    if (!assigned[level] && unassignedIdx < unassigned.length) {
      assigned[level] = unassigned[unassignedIdx];
      unassignedIdx++;
    }
  }

  if (assigned.sd) {
    result.sdNama = assigned.sd.nama;
    result.sdMasuk = assigned.sd.masuk;
    result.sdLulus = assigned.sd.lulus;
  }
  if (assigned.smp) {
    result.smpNama = assigned.smp.nama;
    result.smpMasuk = assigned.smp.masuk;
    result.smpLulus = assigned.smp.lulus;
  }
  if (assigned.sma) {
    result.smaNama = assigned.sma.nama;
    result.smaMasuk = assigned.sma.masuk;
    result.smaLulus = assigned.sma.lulus;
  }
  if (assigned.univ) {
    result.univNama = assigned.univ.nama;
    result.univMasuk = assigned.univ.masuk;
    result.univLulus = assigned.univ.lulus;
  }

  return result;
}

// Check if a value looks like combined/stacked data (multiple entries in one cell)
function looksLikeCombinedData(text) {
  if (!text || typeof text !== "string") return false;
  // Contains newlines = definitely combined
  if (text.includes("\n")) return true;
  // Contains multiple " - " separators (e.g., "FAROJI - 45 THN - Karyawan Pabrik - Rp 3.5 JT")
  const dashCount = (text.match(/\s-\s/g) || []).length;
  if (dashCount >= 2) return true;
  return false;
}

// Check if a line looks like valid family data (has name-like content with separators)
function isFamilyDataLine(line) {
  if (!line || typeof line !== "string") return false;
  const trimmed = line.trim();
  // Empty or just a dash
  if (!trimmed || trimmed === "-") return false;
  // Starts with kanji character (CJK Unified Ideographs range) - likely a family entry with kanji prefix
  if (/^[\u4E00-\u9FFF]/.test(trimmed)) return true;
  // Starts with "- " prefix (typical family list format)
  if (/^-\s+/.test(trimmed)) return true;
  // Contains at least one " - " separator (name - age - job pattern)
  if (trimmed.includes(" - ")) return true;
  // Short single word/name (could be just a name entry)
  if (trimmed.split(/\s+/).length <= 4 && !trimmed.includes("?") && trimmed.length <= 50) return true;
  // If line is long and has no separators, it's likely random text (e.g., "Saya tertarik dengan...")
  return false;
}

// Detect hubungan (relationship) for a family member entry when not explicitly stated
// Priority: (1) explicit keywords in original line, (2) pekerjaan-based detection, (3) heuristic by age/position
function detectHubungan(entry, originalLine, index, allEntries) {
  // If hubungan is already set, do not override
  if (entry.hubungan && entry.hubungan.trim()) return entry.hubungan;

  const lineUpper = (originalLine || "").toUpperCase();

  // 1. Check originalLine for explicit relationship keywords
  const keywordMap = [
    { keywords: ["AYAH", "BAPAK"], value: "Ayah" },
    { keywords: ["IBU", "MAMA"], value: "Ibu" },
    { keywords: ["KAKAK"], value: "Kakak" },
    { keywords: ["ADIK"], value: "Adik" },
    { keywords: ["SUAMI"], value: "Suami" },
    { keywords: ["ISTRI"], value: "Istri" },
    { keywords: ["ANAK"], value: "Anak" },
  ];

  for (const mapping of keywordMap) {
    for (const kw of mapping.keywords) {
      // Use word boundary check to avoid false positives (e.g., "IBUNYA" should not match "IBU")
      const regex = new RegExp("\\b" + kw + "\\b", "i");
      if (regex.test(lineUpper)) {
        return mapping.value;
      }
    }
  }

  // 2. Check entry.pekerjaan for IBU RUMAH TANGGA / IBU RUMAH / IRT patterns
  const pekerjaanUpper = (entry.pekerjaan || "").toUpperCase().trim();
  if (
    pekerjaanUpper.includes("IBU RUMAH TANGGA") ||
    pekerjaanUpper.includes("IBU RUMAH") ||
    pekerjaanUpper === "IRT"
  ) {
    return "Ibu";
  }

  // 3. Heuristic fallback based on age and position
  const age = parseInt(entry.usia, 10);
  if (!isNaN(age) && age > 40) {
    // Check if another entry already claimed "Ayah" or "Ibu"
    const existingRelations = allEntries
      .filter((e, i) => i < index && e.hubungan)
      .map((e) => e.hubungan);
    const ayahTaken = existingRelations.includes("Ayah");
    const ibuTaken = existingRelations.includes("Ibu");

    if (!ibuTaken) {
      // If pekerjaan hints female role or name/context suggests female, assign Ibu
      const femaleHints = /rumah|tangga|irt|ibu|wiraswasta/i;
      if (femaleHints.test(pekerjaanUpper)) {
        return "Ibu";
      }
    }
    if (!ayahTaken) {
      // Default elder to Ayah if not already taken
      return "Ayah";
    }
    if (!ibuTaken) {
      return "Ibu";
    }
  }

  // For younger entries (age <= 40 or no age), guess Kakak or Adik based on position
  if (!isNaN(age) && age <= 40 && index >= 2) {
    return "Adik";
  }
  if (!isNaN(age) && age <= 40 && index >= 1) {
    // If we have parents assigned already, this might be a sibling
    const existingRelations = allEntries
      .filter((e, i) => i < index && e.hubungan)
      .map((e) => e.hubungan);
    if (existingRelations.includes("Ayah") || existingRelations.includes("Ibu")) {
      return "Kakak";
    }
  }

  return "";
}

// Kanji-to-hubungan mapping for family relationship detection
// Longer kanji sequences must come first to ensure correct matching (e.g., 祖父 before 父)
const KANJI_HUBUNGAN_MAP = [
  { kanji: "祖父", hubungan: "Kakek" },
  { kanji: "祖母", hubungan: "Nenek" },
  { kanji: "息子", hubungan: "Anak (Laki-laki)" },
  { kanji: "父", hubungan: "Ayah" },
  { kanji: "母", hubungan: "Ibu" },
  { kanji: "兄", hubungan: "Kakak (Laki-laki)" },
  { kanji: "姉", hubungan: "Kakak (Perempuan)" },
  { kanji: "弟", hubungan: "Adik (Laki-laki)" },
  { kanji: "妹", hubungan: "Adik (Perempuan)" },
  { kanji: "夫", hubungan: "Suami" },
  { kanji: "妻", hubungan: "Istri" },
  { kanji: "娘", hubungan: "Anak (Perempuan)" },
];

// Strip any remaining CJK/Japanese characters from a string
function stripKanjiCharacters(str) {
  if (!str || typeof str !== "string") return str;
  // Remove CJK Unified Ideographs, Hiragana, Katakana, and CJK punctuation/symbols
  return str.replace(/[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uF900-\uFAFF]/g, "").trim();
}

// Detect and extract kanji relationship prefix from a line
// Returns { hubungan, cleanedLine } where hubungan is the mapped relationship or "" if no kanji found
function extractKanjiHubungan(line) {
  const trimmed = line.trim();
  for (const { kanji, hubungan } of KANJI_HUBUNGAN_MAP) {
    if (trimmed.startsWith(kanji)) {
      // Remove kanji and any following fullwidth space, regular space, or " - " separator
      let rest = trimmed.slice(kanji.length);
      // Strip leading fullwidth space (\u3000), regular spaces, and " - " separator
      rest = rest.replace(/^[\u3000\s]*-?\s*/, "").trim();
      return { hubungan, cleanedLine: rest };
    }
  }
  return { hubungan: "", cleanedLine: trimmed };
}

// Parse multi-line family text into array of family members
// Each line format: "nama - usia - pekerjaan - gaji" or "nama - hubungan - usia - pekerjaan - gaji"
// Lines may be prefixed with "- "
// Also handles kanji prefixes like 父, 母, 弟, 妹 etc. which map to hubungan
function parseMultilineFamily(text) {
  if (!text || typeof text !== "string") return [];
  const lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l && l !== "-");
  const result = [];

  for (const line of lines) {
    if (result.length >= 4) break;
    // Filter out non-family data lines (random text like "Saya tertarik dengan...")
    if (!isFamilyDataLine(line)) continue;
    // Remove leading "- " prefix
    const cleanLine = line.replace(/^-\s*/, "").trim();
    if (!cleanLine) continue;
    // Remove trailing "..." (truncated text)
    let trimmedLine = cleanLine.replace(/\.{2,}$/, "").trim();

    // Extract kanji-based hubungan if present (e.g., "父 - Moch Chaerudin - 45")
    const { hubungan: kanjiHubungan, cleanedLine } = extractKanjiHubungan(trimmedLine);
    trimmedLine = cleanedLine;
    // Split by " - " (literal space-dash-space) separator to avoid splitting embedded hyphens in names
    const parts = trimmedLine.split(" - ");
    if (parts.length === 0) continue;

    const entry = { nama: "", hubungan: "", usia: "", pekerjaan: "", gaji: "", tinggalBersama: "" };

    // Detect if a part looks like an age (number with optional THN/th suffix)
    function isAge(val) {
      return /^\d{1,3}\s*(THN|th|thn|tahun)?$/i.test(val.trim());
    }
    // Detect if a part looks like salary (contains Rp or JT/jt or a number pattern)
    function isSalary(val) {
      return /rp\s*/i.test(val) || /jt|juta/i.test(val);
    }

    if (parts.length === 1) {
      entry.nama = parts[0].trim();
    } else if (parts.length === 2) {
      entry.nama = parts[0].trim();
      if (isAge(parts[1])) {
        entry.usia = parts[1].replace(/\s*(THN|th|thn|tahun)\s*/gi, "").trim();
      } else {
        entry.hubungan = parts[1].trim();
      }
    } else if (parts.length === 3) {
      entry.nama = parts[0].trim();
      if (isAge(parts[1])) {
        entry.usia = parts[1].replace(/\s*(THN|th|thn|tahun)\s*/gi, "").trim();
        entry.pekerjaan = parts[2].trim();
      } else {
        entry.hubungan = parts[1].trim();
        if (isAge(parts[2])) {
          entry.usia = parts[2].replace(/\s*(THN|th|thn|tahun)\s*/gi, "").trim();
        } else {
          entry.pekerjaan = parts[2].trim();
        }
      }
    } else if (parts.length === 4) {
      entry.nama = parts[0].trim();
      // Check if second part is age or hubungan
      if (isAge(parts[1])) {
        // Format: nama - usia - pekerjaan - gaji
        entry.usia = parts[1].replace(/\s*(THN|th|thn|tahun)\s*/gi, "").trim();
        entry.pekerjaan = parts[2].trim();
        entry.gaji = parts[3].trim();
      } else {
        // Format: nama - hubungan - usia/pekerjaan - gaji/pekerjaan
        entry.hubungan = parts[1].trim();
        if (isAge(parts[2])) {
          entry.usia = parts[2].replace(/\s*(THN|th|thn|tahun)\s*/gi, "").trim();
          entry.pekerjaan = parts[3].trim();
        } else {
          entry.pekerjaan = parts[2].trim();
          entry.gaji = parts[3].trim();
        }
      }
    } else if (parts.length >= 5) {
      // Format: nama - hubungan - usia - pekerjaan - gaji (or more parts)
      entry.nama = parts[0].trim();
      // Detect hubungan vs usia for second part
      if (isAge(parts[1])) {
        entry.usia = parts[1].replace(/\s*(THN|th|thn|tahun)\s*/gi, "").trim();
        entry.pekerjaan = parts[2].trim();
        entry.gaji = parts.slice(3).join(" - ").trim();
      } else {
        entry.hubungan = parts[1].trim();
        if (isAge(parts[2])) {
          entry.usia = parts[2].replace(/\s*(THN|th|thn|tahun)\s*/gi, "").trim();
          entry.pekerjaan = parts[3].trim();
          entry.gaji = parts.length >= 5 ? parts.slice(4).join(" - ").trim() : "";
        } else {
          entry.usia = parts[2].trim();
          entry.pekerjaan = parts[3].trim();
          entry.gaji = parts.slice(4).join(" - ").trim();
        }
      }
    }

    // If kanji-based hubungan was detected, set it (overrides any parsed hubungan from the remaining text)
    if (kanjiHubungan) {
      entry.hubungan = kanjiHubungan;
    }

    // Strip any leftover kanji/Japanese characters from all family fields
    entry.nama = stripKanjiCharacters(entry.nama);
    entry.hubungan = stripKanjiCharacters(entry.hubungan) || entry.hubungan; // preserve hubungan if stripping removes it entirely (shouldn't happen)
    entry.usia = stripKanjiCharacters(entry.usia);
    entry.pekerjaan = stripKanjiCharacters(entry.pekerjaan);
    entry.gaji = stripKanjiCharacters(entry.gaji);

    // Auto-detect hubungan if not already set
    if (!entry.hubungan || !entry.hubungan.trim()) {
      entry.hubungan = detectHubungan(entry, line, result.length, result);
    }

    result.push(entry);
  }

  return result;
}

// Parse multi-line work history text into array of work entries
// Each line format: "tanggal - nama_perusahaan - optional_details"
function parseMultilineWork(text) {
  if (!text || typeof text !== "string") return [];
  const lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l && l !== "-");
  const result = [];

  for (const line of lines) {
    if (result.length >= 4) break;
    // Remove leading "- " prefix
    const cleanLine = line.replace(/^-\s*/, "").trim();
    if (!cleanLine) continue;
    // Remove trailing "..." (truncated text)
    const trimmedLine = cleanLine.replace(/\.{2,}$/, "").trim();
    // Split by " - " (literal space-dash-space) separator to avoid splitting embedded hyphens in names
    const parts = trimmedLine.split(" - ");
    if (parts.length === 0) continue;

    const entry = { perusahaan: "", masuk: "", keluar: "", bidang: "", status: "", uraian: "" };

    // Check if first part looks like a date (MM/YYYY or YYYY)
    const firstIsDate = /^\d{2}\/\d{4}$/.test(parts[0]) || /^\d{4}$/.test(parts[0]);

    if (firstIsDate && parts.length >= 2) {
      entry.masuk = parts[0].trim();
      entry.perusahaan = parts[1].trim();
      // If there are more parts, check if any is a date (keluar) or details
      if (parts.length >= 3) {
        const thirdIsDate = /^\d{2}\/\d{4}$/.test(parts[2]) || /^\d{4}$/.test(parts[2]);
        if (thirdIsDate) {
          entry.keluar = parts[2].trim();
          if (parts.length >= 4) {
            entry.bidang = parts.slice(3).join(" - ").trim();
          }
        } else {
          entry.bidang = parts.slice(2).join(" - ").trim();
        }
      }
    } else if (parts.length === 1) {
      entry.perusahaan = parts[0].trim();
    } else {
      // First part is not a date - treat as perusahaan
      entry.perusahaan = parts[0].trim();
      // Look for date in remaining parts
      for (let i = 1; i < parts.length; i++) {
        if (/^\d{2}\/\d{4}$/.test(parts[i]) || /^\d{4}$/.test(parts[i])) {
          if (!entry.masuk) entry.masuk = parts[i].trim();
          else if (!entry.keluar) entry.keluar = parts[i].trim();
        } else {
          if (!entry.bidang) entry.bidang = parts[i].trim();
          else entry.bidang += " - " + parts[i].trim();
        }
      }
    }

    result.push(entry);
  }

  return result;
}

function normalizeKategori(rawValue) {
  if (!rawValue) return "NEW COMER";
  const upper = rawValue.toUpperCase().trim();
  if (upper.includes("MAGANG") || upper.includes("TRAINEER") || upper.includes("TRAINEE")) {
    return "EX-MAGANG/EX-TRAINEER";
  }
  if (upper.includes("ENGINEERING") || upper.includes("GIJINKOKU")) {
    return "ENGINEERING/GIJINKOKU";
  }
  return "NEW COMER";
}

function parseRow(headers, values) {
  // Normalize all headers for better matching
  const normalizedHeaders = headers.map(normalizeHeader);

  // Smart getter with normalization and fuzzy matching
  const get = (...keywords) => {
    // Phase 1: Exact substring match on normalized headers
    for (const keyword of keywords) {
      const nk = normalizeHeader(keyword);
      const idx = normalizedHeaders.findIndex((h) => h && h.includes(nk));
      if (idx >= 0 && values[idx] && values[idx].trim()) {
        return values[idx].trim();
      }
    }
    // Phase 2: Reverse substring (header contained in keyword)
    for (const keyword of keywords) {
      const nk = normalizeHeader(keyword);
      const idx = normalizedHeaders.findIndex((h) => h && nk.includes(h));
      if (idx >= 0 && values[idx] && values[idx].trim()) {
        return values[idx].trim();
      }
    }
    // Phase 3: Fuzzy matching with similarity threshold
    for (const keyword of keywords) {
      let bestIdx = -1;
      let bestScore = 0;
      for (let i = 0; i < normalizedHeaders.length; i++) {
        if (!normalizedHeaders[i]) continue;
        const score = similarity(normalizeHeader(keyword), normalizedHeaders[i]);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestScore > 0.7 && bestIdx >= 0 && values[bestIdx] && values[bestIdx].trim()) {
        return values[bestIdx].trim();
      }
    }
    return "";
  };

  // Try to find name from multiple possible columns (Responses 1 vs Responses 3)
  const nama = get("NAMA LENGKAP", "NAMA LENGKAP SESUAI PASPOR", "NAMA SESUAI PASPOR", "NAMA LENGKAP ANDA");
  if (!nama) return null;

  const result = {
    kodeReferensi: get("Kode Referensi", "KODE REFERENSI", "REFERENSI"),
    kodeJob: get("Kode Job", "KODE JOB", "KODE PEKERJAAN"),
    kategoriKandidat: normalizeKategori(get("KATEGORI KANDIDAT", "KANDIDAT", "KATEGORI")),
    domisili: get("DOMISILI", "KOTA DOMISILI", "KOTA TINGGAL"),
    namaLengkap: nama,
    namaPanggilan: get("NAMA PANGGILAN", "PANGGILAN"),
    bidangKerja: get("BIDANG KERJA YANG DIPILIH", "BIDANG SSW YANG DILAMAR", "BIDANG TG YANG DILAMAR", "BIDANG KERJA", "BIDANG SSW", "BIDANG YANG DILAMAR", "BIDANG"),
    noHp: get("NO. HP AKTIF", "NO HP AKTIF", "NO TELP AKTIF", "NO TELP", "NO HP", "NOMOR HP", "NO. TELP", "NOMOR TELEPON", "NOMOR HP AKTIF", "NOMER HP"),
    email: get("ALAMAT EMAIL", "EMAIL", "E-MAIL", "ALAMAT E-MAIL"),
    tanggalLahir: get("TANGGAL LAHIR", "TANGGA LAHIR", "TGL LAHIR", "TGL. LAHIR", "TANGGALLAHIR"),
    tempatLahir: get("TEMPAT LAHIR", "KOTA LAHIR"),
    alamatLengkap: get("ALAMAT LENGKAP", "ALAMAT LENGKAP SESUAI KTP", "ALAMAT KTP", "ALAMAT RUMAH", "ALAMAT"),
    jenisKelamin: get("JENIS KELAMIN", "KELAMIN", "GENDER"),
    agama: get("AGAMA"),
    golonganDarah: get("GOLONGAN DARAH", "GOL DARAH", "GOL. DARAH"),
    tinggiBadan: get("TINGGI BADAN", "TINGGI", "TB"),
    beratBadan: get("BERAT BADAN", "BERAT", "BB"),
    dominanTangan: get("DOMINAN TANGAN", "TANGAN DOMINAN"),
    butaWarna: get("BUTA WARNA"),
    merokok: get("APAKAH ANDA MEROKOK", "MEROKOK", "ANDA MEROKOK"),
    minumAlkohol: get("APAKAH ANDA MINUM ALKOHOL", "MINUM ALKOHOL", "ALKOHOL"),
    tato: get("APAKAH MEMILIKI TATO", "BERTATO", "TATO", "MEMILIKI TATO"),
    penyakitBerat: get("APAKAH MEMILIKI PENYAKIT BERAT", "APAKAH PUNYA PENYAKIT BERAT", "PENYAKIT BERAT", "RIWAYAT PENYAKIT"),
    alergi: get("APAKAH MEMILIKI ALERGI", "APAKAH PUNYA ALERGI", "ALERGI"),
    hobi: get("HOBI", "HOBBY"),
    statusPernikahan: get("STATUS PERNIKAHAN", "STATUS MENIKAH", "PERNIKAHAN"),
    pernahKeJepang: get("APAKAH PERNAH KE JEPANG", "PERNAH KE JEPANG"),
    memilikiPaspor: get("APAKAH MEMILIKI PASPOR", "MEMILIKI PASPOR", "PASPOR"),
    nomorPaspor: get("NOMOR PASPOR", "NO PASPOR", "NO. PASPOR"),
    masaBerlakuPaspor: get("MASA BERLAKU PASPOR", "BERLAKU PASPOR", "EXPIRED PASPOR"),
    memilikiSim: get("APAKAH MEMILIKI SIM", "MEMILIKI SIM", "SIM"),
    jenisSim: get("JENIS SIM", "TIPE SIM", "SIM TYPE") || (() => {
      const simVal = get("SIM");
      if (simVal) {
        const upper = simVal.toUpperCase();
        if (upper.includes("B2")) return "SIM B2";
        if (upper.includes("B1")) return "SIM B1";
        if (upper.includes("A")) return "SIM A";
        if (upper.includes("C")) return "SIM C";
      }
      return "";
    })(),
    nomorSim: get("NOMOR SIM", "NO SIM", "NO. SIM"),
    keluarga: [
      { nama: get("DATA KELUARGA 1 : NAMA LENGKAP", "DAFTAR KELUARGA 1 :  ISI NAMA LENGKAP", "DAFTAR KELUARGA 1 : NAMA LENGKAP", "KELUARGA 1 NAMA"), hubungan: get("DATA KELUARGA 1 : HUBUNGAN", "DAFTAR KELUARGA 1 :  STATUS HUBUNGAN", "DAFTAR KELUARGA 1 : HUBUNGAN", "KELUARGA 1 HUBUNGAN"), usia: get("DATA KELUARGA 1 : USIA", "DAFTAR KELUARGA 1 : USIA", "KELUARGA 1 USIA"), pekerjaan: get("DATA KELUARGA 1 : PEKERJAAN", "DAFTAR KELUARGA 1 : PEKERJAAN", "KELUARGA 1 PEKERJAAN"), gaji: get("DATA KELUARGA 1 : GAJI", "DAFTAR KELUARGA 1 : PENDAPATAN", "KELUARGA 1 GAJI", "KELUARGA 1 PENDAPATAN"), tinggalBersama: get("DATA KELUARGA 1 : APAKAH TINGGAL", "DAFTAR KELUARGA 1 : APAKAH TINGGAL", "KELUARGA 1 TINGGAL") },
      { nama: get("DATA KELUARGA 2 : NAMA LENGKAP", "DAFTAR KELUARGA 2 :  ISI NAMA LENGKAP", "DAFTAR KELUARGA 2 : NAMA LENGKAP", "KELUARGA 2 NAMA"), hubungan: get("DATA KELUARGA 2 : HUBUNGAN", "DAFTAR KELUARGA 2 :  STATUS HUBUNGAN", "DAFTAR KELUARGA 2 : HUBUNGAN", "KELUARGA 2 HUBUNGAN"), usia: get("DATA KELUARGA 2 : USIA", "DAFTAR KELUARGA 2 : USIA", "KELUARGA 2 USIA"), pekerjaan: get("DATA KELUARGA 2 : PEKERJAAN", "DAFTAR KELUARGA 2 : PEKERJAAN", "KELUARGA 2 PEKERJAAN"), gaji: get("DATA KELUARGA 2 : GAJI", "DAFTAR KELUARGA 2 : PENDAPATAN", "KELUARGA 2 GAJI", "KELUARGA 2 PENDAPATAN"), tinggalBersama: get("DATA KELUARGA 2 : APAKAH TINGGAL", "DAFTAR KELUARGA 2 : APAKAH TINGGAL", "KELUARGA 2 TINGGAL") },
      { nama: get("DATA KELUARGA 3 : NAMA LENGKAP", "DAFTAR KELUARGA 3 :  ISI NAMA LENGKAP", "DAFTAR KELUARGA 3 : NAMA LENGKAP", "KELUARGA 3 NAMA"), hubungan: get("DATA KELUARGA 3 : HUBUNGAN", "DAFTAR KELUARGA 3 :  STATUS HUBUNGAN", "DAFTAR KELUARGA 3 : HUBUNGAN", "KELUARGA 3 HUBUNGAN"), usia: get("DATA KELUARGA 3 : USIA", "DAFTAR KELUARGA 3 : USIA", "KELUARGA 3 USIA"), pekerjaan: get("DATA KELUARGA 3 : PEKERJAAN", "DAFTAR KELUARGA 3 : PEKERJAAN", "KELUARGA 3 PEKERJAAN"), gaji: get("DATA KELUARGA 3 : GAJI", "DAFTAR KELUARGA 3 : PENDAPATAN", "KELUARGA 3 GAJI", "KELUARGA 3 PENDAPATAN"), tinggalBersama: get("DATA KELUARGA 3 : APAKAH TINGGAL", "DAFTAR KELUARGA 3 : APAKAH TINGGAL", "KELUARGA 3 TINGGAL") },
      { nama: get("DATA KELUARGA 4 : NAMA LENGKAP", "DAFTAR KELUARGA 4 :  ISI NAMA LENGKAP", "DAFTAR KELUARGA 4 : NAMA LENGKAP", "KELUARGA 4 NAMA"), hubungan: get("DATA KELUARGA 4 : HUBUNGAN", "DAFTAR KELUARGA 4 :  STATUS HUBUNGAN", "DAFTAR KELUARGA 4 : HUBUNGAN", "KELUARGA 4 HUBUNGAN"), usia: get("DATA KELUARGA 4 : USIA", "DAFTAR KELUARGA 4 : USIA", "KELUARGA 4 USIA"), pekerjaan: get("DATA KELUARGA 4 : PEKERJAAN", "DAFTAR KELUARGA 4 : PEKERJAAN", "KELUARGA 4 PEKERJAAN"), gaji: get("DATA KELUARGA 4 : GAJI", "DAFTAR KELUARGA 4 : PENDAPATAN", "KELUARGA 4 GAJI", "KELUARGA 4 PENDAPATAN"), tinggalBersama: get("DATA KELUARGA 4 : APAKAH TINGGAL", "DAFTAR KELUARGA 4 : APAKAH TINGGAL", "KELUARGA 4 TINGGAL") },
    ],
    sdNama: get("RIWAYAT PENDIDIKAN  SD: NAMA SEKOLAH", "RIWAYAT PENDIDIKAN SD : NAMA SEKOLAH", "RIWAYAT PENDIDIKAN SD: NAMA SEKOLAH", "SD NAMA SEKOLAH"),
    sdMasuk: get("RIWAYAT PENDIDKAN SD : TANGGAL MASUK", "RIWAYAT PENDIDIKAN SD : TANGGAL MASUK", "SD TANGGAL MASUK"),
    sdLulus: get("RIWAYAT PENDIDKAN SD : TANGGAL LULUS", "RIWAYAT PENDIDIKAN SD : TANGGAL LULUS", "SD TANGGAL LULUS"),
    smpNama: get("RIWAYAT PENDIDIKAN  SMP: NAMA SEKOLAH", "RIWAYAT PENDIDIKAN SMP : NAMA SEKOLAH", "RIWAYAT PENDIDIKAN SMP: NAMA SEKOLAH", "SMP NAMA SEKOLAH"),
    smpMasuk: get("RIWAYAT PENDIDKAN SMP : TANGGAL MASUK", "RIWAYAT PENDIDIKAN SMP : TANGGAL MASUK", "SMP TANGGAL MASUK"),
    smpLulus: get("RIWAYAT PENDIDKAN SMP : TANGGAL LULUS", "RIWAYAT PENDIDIKAN SMP : TANGGAL LULUS", "SMP TANGGAL LULUS"),
    smaNama: get("RIWAYAT PENDIDIKAN  SMA/K: NAMA SEKOLAH", "RIWAYAT PENDIDIKAN SMA/K : NAMA SEKOLAH", "RIWAYAT PENDIDIKAN SMA/K: NAMA SEKOLAH", "SMA NAMA SEKOLAH"),
    smaMasuk: get("RIWAYAT PENDIDKAN SMA/K : TANGGAL MASUK", "RIWAYAT PENDIDIKAN SMA/K : TANGGAL MASUK", "SMA TANGGAL MASUK"),
    smaLulus: get("RIWAYAT PENDIDKAN SMA/K : TANGGAL LULUS", "RIWAYAT PENDIDIKAN SMA/K : TANGGAL LULUS", "SMA TANGGAL LULUS"),
    smaJurusan: get("RIWAYAT PENDIDKAN SMA/K : JURUSAN", "RIWAYAT PENDIDIKAN SMA/K : JURUSAN", "SMA JURUSAN"),
    univNama: get("RIWAYAT PENDIDIKAN  UNIVERSITAS: NAMA SEKOLAH", "RIWAYAT PENDIDIKAN UNIVERSITAS : NAMA UNIVERSITAS", "RIWAYAT PENDIDIKAN UNIVERSITAS: NAMA", "UNIVERSITAS NAMA"),
    univMasuk: get("RIWAYAT PENDIDKAN UNIVERSITAS : TANGGAL MASUK", "RIWAYAT PENDIDIKAN UNIVERSITAS : TANGGAL MASUK", "UNIVERSITAS TANGGAL MASUK"),
    univLulus: get("RIWAYAT PENDIDKAN UNIVERSITAS : TANGGAL LULUS", "RIWAYAT PENDIDIKAN UNIVERSITAS : TANGGAL LULUS", "UNIVERSITAS TANGGAL LULUS"),
    univJurusan: get("RIWAYAT PENDIDKAN UNIVERSITAS : JURUSAN", "RIWAYAT PENDIDIKAN UNIVERSITAS : JURUSAN", "UNIVERSITAS JURUSAN"),
    pekerjaan: [
      { perusahaan: get("RIWAYAT BEKERJA 1 : NAMA PERUSAHAAN", "RIWAYAT PEKERJAAN 1 : NAMA PERUSAHAAN", "PEKERJAAN 1 PERUSAHAAN"), masuk: get("RIWAYAT BEKERJA 1 : TANGGAL MASUK", "RIWAYAT PEKERJAAN 1 : TANGGAL MASUK", "PEKERJAAN 1 MASUK"), keluar: get("RIWAYAT BEKERJA 1 : TANGGAL KELUAR", "RIWAYAT PEKERJAAN 1 : TANGGAL KELUAR", "PEKERJAAN 1 KELUAR"), bidang: get("RIWAYAT BEKERJA 1 : BIDANG PEKERJAAN", "RIWAYAT PEKERJAAN 1 : POSISI PEKERJAAN", "PEKERJAAN 1 BIDANG", "PEKERJAAN 1 POSISI"), status: get("RIWAYAT BEKERJA 1 : STATUS PEKERJA", "RIWAYAT PEKERJAAN 1 : JENIS KONTRAK", "PEKERJAAN 1 STATUS", "PEKERJAAN 1 KONTRAK"), uraian: get("RIWAYAT BEKERJA 1 : URAIAN PEKERJAAN", "URAIAN PEKERJAAN YANG DILAKUKAN", "PEKERJAAN 1 URAIAN") },
      { perusahaan: get("RIWAYAT BEKERJA 2 : NAMA PERUSAHAAN", "RIWAYAT PEKERJAAN 2 : NAMA PERUSAHAAN", "PEKERJAAN 2 PERUSAHAAN"), masuk: get("RIWAYAT BEKERJA 2 : TANGGAL MASUK", "RIWAYAT PEKERJAAN 2 : TANGGAL MASUK", "PEKERJAAN 2 MASUK"), keluar: get("RIWAYAT BEKERJA 2 : TANGGAL KELUAR", "RIWAYAT PEKERJAAN 2 : TANGGAL KELUAR", "PEKERJAAN 2 KELUAR"), bidang: get("RIWAYAT BEKERJA 2 : BIDANG PEKERJAAN", "RIWAYAT PEKERJAAN 2 : POSISI PEKERJAAN", "PEKERJAAN 2 BIDANG", "PEKERJAAN 2 POSISI"), status: get("RIWAYAT BEKERJA 2 : STATUS PEKERJA", "RIWAYAT PEKERJAAN 2 : JENIS KONTRAK", "PEKERJAAN 2 STATUS", "PEKERJAAN 2 KONTRAK"), uraian: get("RIWAYAT BEKERJA 2 : URAIAN PEKERJAAN", "URAIAN PEKERJAAN YANG DILAKUKAN 2", "PEKERJAAN 2 URAIAN") },
      { perusahaan: get("RIWAYAT BEKERJA 3 : NAMA PERUSAHAAN", "RIWAYAT PEKERJAAN 3 : NAMA PERUSAHAAN", "PEKERJAAN 3 PERUSAHAAN"), masuk: get("RIWAYAT BEKERJA 3 : TANGGAL MASUK", "RIWAYAT PEKERJAAN 3 : TANGGAL MASUK", "PEKERJAAN 3 MASUK"), keluar: get("RIWAYAT BEKERJA 3 : TANGGAL KELUAR", "RIWAYAT PEKERJAAN 3 : TANGGAL KELUAR", "PEKERJAAN 3 KELUAR"), bidang: get("RIWAYAT BEKERJA 3 : BIDANG PEKERJAAN", "RIWAYAT PEKERJAAN 3 : POSISI PEKERJAAN", "PEKERJAAN 3 BIDANG", "PEKERJAAN 3 POSISI"), status: get("RIWAYAT BEKERJA 3 : STATUS PEKERJA", "RIWAYAT PEKERJAAN 3 : JENIS KONTRAK", "PEKERJAAN 3 STATUS", "PEKERJAAN 3 KONTRAK"), uraian: get("RIWAYAT BEKERJA 3 : URAIAN PEKERJAAN", "URAIAN PEKERJAAN YANG DILAKUKAN 3", "PEKERJAAN 3 URAIAN") },
      { perusahaan: get("RIWAYAT BEKERJA 4 : NAMA PERUSAHAAN", "RIWAYAT PEKERJAAN 4 : NAMA PERUSAHAAN", "PEKERJAAN 4 PERUSAHAAN"), masuk: get("RIWAYAT BEKERJA 4 : TANGGAL MASUK", "RIWAYAT PEKERJAAN 4 : TANGGAL MASUK", "PEKERJAAN 4 MASUK"), keluar: get("RIWAYAT BEKERJA 4 : TANGGAL KELUAR", "RIWAYAT PEKERJAAN 4 : TANGGAL KELUAR", "PEKERJAAN 4 KELUAR"), bidang: get("RIWAYAT BEKERJA 4 : BIDANG PEKERJAAN", "RIWAYAT PEKERJAAN 4: POSISI PEKERJAAN", "RIWAYAT PEKERJAAN 4 : POSISI PEKERJAAN", "PEKERJAAN 4 BIDANG", "PEKERJAAN 4 POSISI"), status: get("RIWAYAT BEKERJA 4 : STATUS PEKERJA", "RIWAYAT PEKERJAAN 4 : JENIS KONTRAK", "PEKERJAAN 4 STATUS", "PEKERJAAN 4 KONTRAK"), uraian: get("RIWAYAT BEKERJA 4 : URAIAN PEKERJAAN", "URAIAN PEKERJAAN YANG DILAKUKAN 4", "PEKERJAAN 4 URAIAN") },
    ],
    kelebihan: get("KELEBIHAN ANDA", "KELEBIHAN"),
    kekurangan: get("KEKURANGAN ANDA", "KEKURANGAN"),
    alasanKeJepang: get("ALASAN INGIN KE JEPANG", "ALASAN INGIN PERGI KE JEPANG", "ALASAN KE JEPANG"),
    alasanMelamarBidang: get("ALASAN INGIN MELAMAR KE BIDANG INI", "ALASAN MELAMAR JOB DI BIDANG INI", "ALASAN MELAMAR BIDANG"),
    alasanKaigofukushishi: get("ALASAN INGIN MENJADI KAIGOFUKUSHISHI", "ALASAN INGIN MENJADI KAIGO FUKUSHISHI", "KAIGOFUKUSHISHI"),
    impianMasaDepan: get("IMPIAN DI MASA DEPAN", "IMPIAN MASA DEPAN", "IMPIAN"),
    lamaInginTinggal: get("LAMA INGIN TINGGAL DI JEPANG", "LAMA TINGGAL DI JEPANG"),
    lamaBelajarBahasaJepang: get("LAMA BELAJAR BAHASA JEPANG", "DURASI BELAJAR BAHASA JEPANG", "BELAJAR BAHASA JEPANG"),
    nomorDarurat: get("NOMOR DARURAT : NO HP", "NO TELP DARURAT", "NOMOR DARURAT", "NO HP DARURAT"),
    namaPemilikDarurat: get("NOMOR DARURAT : NAMA LENGKAP PEMILIK NOMOR HP", "NAMA LENGKAP PEMILIK NOMOR DARURAT", "NAMA PEMILIK NOMOR DARURAT", "NAMA KONTAK DARURAT"),
    hubunganDarurat: get("NOMOR DARURAT : HUBUNGAN DENGAN PELAMAR", "HUBUNGAN DENGAN PELAMAR", "HUBUNGAN DARURAT"),
    // Documents
    pasPhoto: get("PAS PHOTO 3X4", "PAS FOTO", "PAS PHOTO", "PHOTO", "FOTO 3X4", "PAS FOTO 3X4"),
    sertifikatBahasaJepang: get("SERTIFIKAT BAHASA JEPANG", "SERTIFIKAT JLPT", "SERTIFIKAT NAT"),
    videoJFT: get("VIDEO SCREEN RECORDING JFT", "VIDEO JFT", "SCREEN RECORDING JFT"),
    sertifikatSSW: get("SERTIFIKAT SSW", "SERTIFIKAT SSW / SENMONKYU", "SERTIFIKAT SSW/SENMONKYU"),
    videoSSW: get("VIDEO SCREEN RECORDING SSW", "VIDEO SSW", "SCREEN RECORDING SSW"),
    cvRirekisho: get("CV/RIREKISHO", "CV/RIREKISHO FORMAT BEBAS", "RIREKISHO", "CV"),
    sertifikatSenmonkyuu: get("SERTIFIKAT SENMONKYUU", "SENMONKYUU/HYOUKACHOSHO", "SENMONKYUU", "HYOUKACHOSHO"),
    sertifikatSelesaiMagang: get("SERTIFIKAT SELESAI MAGANG", "SELESAI MAGANG"),
    // Promosi diri
    promosiDiri: get("PROMOSIKAN DIRI ANDA", "PROMOSI DIRI ANDA", "PROMOSI DIRI"),
    importedAt: new Date().toISOString(),
    submittedAt: get("Timestamp") || new Date().toISOString(),
  };

  // Post-processing: auto-detect and parse multi-line combined cells
  // 1. Education: if any individual education fields are empty, try combined column
  if (!result.sdNama || !result.smpNama || !result.smaNama || !result.univNama) {
    const combinedEdu = get(
      "RIWAYAT PENDIDIKAN (SD-Pendidikan terakhir)",
      "RIWAYAT PENDIDIKAN (SD-PENDIDIKAN TERAKHIR)",
      "RIWAYAT PENDIDIKAN",
      "PENDIDIKAN (SD-Pendidikan terakhir)"
    );
    if (combinedEdu) {
      const eduParsed = parseMultilineEducation(combinedEdu);
      if (eduParsed.sdNama && !result.sdNama) result.sdNama = eduParsed.sdNama;
      if (eduParsed.sdMasuk && !result.sdMasuk) result.sdMasuk = eduParsed.sdMasuk;
      if (eduParsed.sdLulus && !result.sdLulus) result.sdLulus = eduParsed.sdLulus;
      if (eduParsed.smpNama && !result.smpNama) result.smpNama = eduParsed.smpNama;
      if (eduParsed.smpMasuk && !result.smpMasuk) result.smpMasuk = eduParsed.smpMasuk;
      if (eduParsed.smpLulus && !result.smpLulus) result.smpLulus = eduParsed.smpLulus;
      if (eduParsed.smaNama && !result.smaNama) result.smaNama = eduParsed.smaNama;
      if (eduParsed.smaMasuk && !result.smaMasuk) result.smaMasuk = eduParsed.smaMasuk;
      if (eduParsed.smaLulus && !result.smaLulus) result.smaLulus = eduParsed.smaLulus;
      if (eduParsed.smaJurusan && !result.smaJurusan) result.smaJurusan = eduParsed.smaJurusan;
      if (eduParsed.univNama && !result.univNama) result.univNama = eduParsed.univNama;
      if (eduParsed.univMasuk && !result.univMasuk) result.univMasuk = eduParsed.univMasuk;
      if (eduParsed.univLulus && !result.univLulus) result.univLulus = eduParsed.univLulus;
      if (eduParsed.univJurusan && !result.univJurusan) result.univJurusan = eduParsed.univJurusan;
    }
  }

  // 2. Family: if first family member is empty OR contains raw multi-line/combined data (substring collision), parse combined column
  const familyHasCombinedData = result.keluarga[0].nama && looksLikeCombinedData(result.keluarga[0].nama);
  // If all data went to first slot: keluarga[0].nama has content, keluarga[1] is empty,
  // and the content looks suspiciously long or has separator patterns
  const familyAllInFirstSlot = result.keluarga[0].nama && !result.keluarga[1].nama 
    && (result.keluarga[0].nama.length > 30 || (result.keluarga[0].nama.includes(" - ") && result.keluarga[0].nama.length > 15));
  const familyNeedsParsing = !result.keluarga[0].nama || familyHasCombinedData || familyAllInFirstSlot;
  if (familyNeedsParsing) {
    // If keluarga[0].nama itself contains combined data, it was matched from the combined column via substring collision
    let combinedFamily = familyHasCombinedData
      ? result.keluarga[0].nama
      : get(
          "DAFTAR KELUARGA 1 : ISI NAMA LENGKAP KELUARGA ANDA",
          "DAFTAR KELUARGA 1 :  ISI NAMA LENGKAP KELUARGA ANDA",
          "DAFTAR KELUARGA",
          "KELUARGA ANDA",
          "DATA KELUARGA"
        );
    if (combinedFamily && looksLikeCombinedData(combinedFamily)) {
      const familyParsed = parseMultilineFamily(combinedFamily);
      if (familyParsed.length > 0) {
        // Reset keluarga array slots and fill from parsed data
        for (let i = 0; i < 4; i++) {
          if (familyParsed[i]) {
            result.keluarga[i] = {
              nama: familyParsed[i].nama || "",
              hubungan: familyParsed[i].hubungan || "",
              usia: familyParsed[i].usia || "",
              pekerjaan: familyParsed[i].pekerjaan || "",
              gaji: familyParsed[i].gaji || "",
              tinggalBersama: familyParsed[i].tinggalBersama || ""
            };
          } else {
            // Clear remaining slots since we're reparsing from combined data
            result.keluarga[i] = { nama: "", hubungan: "", usia: "", pekerjaan: "", gaji: "", tinggalBersama: "" };
          }
        }
      }
    }
  }

  // 3. Work: if first work entry is empty OR contains raw multi-line/combined data (substring collision), parse combined column
  const workHasCombinedData = result.pekerjaan[0].perusahaan && looksLikeCombinedData(result.pekerjaan[0].perusahaan);
  const workAllInFirstSlot = result.pekerjaan[0].perusahaan && !result.pekerjaan[1].perusahaan
    && (result.pekerjaan[0].perusahaan.length > 30 || (result.pekerjaan[0].perusahaan.includes(" - ") && result.pekerjaan[0].perusahaan.length > 15));
  const workNeedsParsing = !result.pekerjaan[0].perusahaan || workHasCombinedData || workAllInFirstSlot;
  if (workNeedsParsing) {
    // If perusahaan itself contains combined data, it was matched from the combined column via substring collision
    let combinedWork = workHasCombinedData
      ? result.pekerjaan[0].perusahaan
      : get(
          "RIWAYAT BEKERJA",
          "RIWAYAT PEKERJAAN",
          "RIWAYAT BEKERJA (TERBARU)"
        );
    if (combinedWork && looksLikeCombinedData(combinedWork)) {
      const workParsed = parseMultilineWork(combinedWork);
      if (workParsed.length > 0) {
        for (let i = 0; i < 4; i++) {
          if (workParsed[i]) {
            result.pekerjaan[i] = {
              perusahaan: workParsed[i].perusahaan || "",
              masuk: workParsed[i].masuk || "",
              keluar: workParsed[i].keluar || "",
              bidang: workParsed[i].bidang || "",
              status: workParsed[i].status || "",
              uraian: workParsed[i].uraian || ""
            };
          } else {
            // Clear remaining slots since we're reparsing from combined data
            result.pekerjaan[i] = { perusahaan: "", masuk: "", keluar: "", bidang: "", status: "", uraian: "" };
          }
        }
      }
    }
  }

  // 4. Emergency contact: if nomorDarurat contains combined data (multiple contacts stacked), parse it
  // Format could be: "nama - no hp - hubungan\nnama2 - no hp2 - hubungan2" or all in one field
  if (result.nomorDarurat && looksLikeCombinedData(result.nomorDarurat)) {
    // Combined emergency data in nomorDarurat field - try to extract structured info
    const lines = result.nomorDarurat.split(/\n/).map((l) => l.trim()).filter((l) => l && l !== "-");
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^-\s*/, "").trim();
      const parts = firstLine.split(" - ");
      if (parts.length >= 2) {
        // Try to identify which part is phone, name, relationship
        let phone = "", name = "", hubungan = "";
        for (const part of parts) {
          const p = part.trim();
          if (/^[\d\s+\-()]{8,}$/.test(p) || /^0\d+/.test(p) || /^\+?\d{10,}/.test(p)) {
            phone = p;
          } else if (!name) {
            name = p;
          } else {
            hubungan = p;
          }
        }
        if (phone) result.nomorDarurat = phone;
        if (name && !result.namaPemilikDarurat) result.namaPemilikDarurat = name;
        if (hubungan && !result.hubunganDarurat) result.hubunganDarurat = hubungan;
      }
    }
  }
  // Also check if namaPemilikDarurat has combined data
  if (result.namaPemilikDarurat && looksLikeCombinedData(result.namaPemilikDarurat)) {
    const lines = result.namaPemilikDarurat.split(/\n/).map((l) => l.trim()).filter((l) => l && l !== "-");
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^-\s*/, "").trim();
      const parts = firstLine.split(" - ");
      if (parts.length >= 2) {
        let phone = "", name = "", hubungan = "";
        for (const part of parts) {
          const p = part.trim();
          if (/^[\d\s+\-()]{8,}$/.test(p) || /^0\d+/.test(p) || /^\+?\d{10,}/.test(p)) {
            phone = p;
          } else if (!name) {
            name = p;
          } else {
            hubungan = p;
          }
        }
        if (name) result.namaPemilikDarurat = name;
        if (phone && !result.nomorDarurat) result.nomorDarurat = phone;
        if (hubungan && !result.hubunganDarurat) result.hubunganDarurat = hubungan;
      }
    }
  }

  return result;
}

export default function ImportPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [status, setStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [headerMapping, setHeaderMapping] = useState(null);
  const [sheetUrl, setSheetUrl] = useState(
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`
  );
  const [customSheetId, setCustomSheetId] = useState(SPREADSHEET_ID);
  const [customSheetName, setCustomSheetName] = useState("Form Responses 3");

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  // Fetch data langsung dari Google Sheets (public)
  const fetchFromSheets = async () => {
    setFetching(true);
    setStatus("");
    setPreview([]);
    setHeaderMapping(null);

    try {
      // Gunakan Google Sheets API v4 (publik tanpa auth jika sheet di-share publik)
      const encodedSheet = encodeURIComponent(customSheetName);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${customSheetId}/values/${encodedSheet}?key=${API_KEY}`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 403) {
          setStatus("Error: Spreadsheet belum di-share sebagai public. Buka spreadsheet → Share → Anyone with the link → Viewer");
        } else if (res.status === 400) {
          setStatus("Error: Nama sheet salah atau Google Sheets API belum di-enable. Pastikan nama sheet benar.");
        } else {
          setStatus(`Error: ${err.error?.message || "Gagal fetch data"}`);
        }
        setFetching(false);
        return;
      }

      const data = await res.json();
      const rows = data.values || [];
      
      if (rows.length < 2) {
        setStatus("Sheet kosong atau hanya ada header");
        setFetching(false);
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);
      const parsed = dataRows.map((row) => parseRow(headers, row)).filter(Boolean);
      
      // Analyze header mapping
      const mapping = analyzeHeaderMapping(headers);
      setHeaderMapping(mapping);
      
      setPreview(parsed);
      setStatus(`Berhasil fetch ${parsed.length} data dari Google Sheets (${mapping.matched.length} kolom ter-mapping, ${mapping.unmatched.length} tidak dikenali)`);
    } catch (err) {
      setStatus(`Error: ${err.message}. Pastikan spreadsheet sudah di-share sebagai public viewer.`);
    }
    setFetching(false);
  };

  // Fallback: upload CSV manual
  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setStatus("");
    setPreview([]);
    setHeaderMapping(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n").map((l) => l.split("\t").length > 3 ? l.split("\t") : l.split(","));
      if (lines.length > 1) {
        const headers = lines[0];
        const parsed = lines.slice(1).map((row) => parseRow(headers, row)).filter(Boolean);
        const mapping = analyzeHeaderMapping(headers);
        setHeaderMapping(mapping);
        setPreview(parsed);
        setStatus(`${parsed.length} data dari file CSV (${mapping.matched.length} kolom ter-mapping, ${mapping.unmatched.length} tidak dikenali)`);
      }
    };
    reader.readAsText(f, "UTF-8");
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setStatus("Mengambil data existing dari Firestore...");

    // Fetch all existing candidates and build a map keyed by normalized namaLengkap
    let existingMap = {}; // normalized name -> { docId, data }
    try {
      const snapshot = await getDocs(collection(db, "candidates"));
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.namaLengkap) {
          const normalizedName = data.namaLengkap.trim().toLowerCase();
          existingMap[normalizedName] = { docId: docSnap.id, data };
        }
      });
    } catch (err) {
      console.error("Error fetching existing candidates:", err);
      setStatus("Error: Gagal mengambil data existing dari Firestore.");
      setImporting(false);
      return;
    }

    let newCount = 0;
    let updatedCount = 0;
    let processed = 0;

    for (const candidate of preview) {
      try {
        const normalizedName = (candidate.namaLengkap || "").trim().toLowerCase();
        const existing = existingMap[normalizedName];

        if (existing) {
          // Merge: only fill in fields that are empty/missing in existing record
          const updateData = buildMergeUpdate(existing.data, candidate);
          if (Object.keys(updateData).length > 0) {
            await updateDoc(doc(db, "candidates", existing.docId), updateData);
            updatedCount++;
          }
        } else {
          // New candidate: create with generated docId
          const docId = (candidate.namaLengkap || "unknown")
            .replace(/[^a-zA-Z0-9]/g, "_")
            .toLowerCase()
            .substring(0, 30) + "_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

          await setDoc(doc(db, "candidates", docId), {
            ...candidate,
            userId: "imported",
            source: "spreadsheet_import",
          });
          newCount++;
          // Add to existing map so subsequent duplicates in same batch are caught
          existingMap[normalizedName] = { docId, data: { ...candidate, userId: "imported", source: "spreadsheet_import" } };
        }

        processed++;
        setStatus(`Mengimport... ${processed}/${preview.length}`);
      } catch (err) {
        console.error("Import error:", err);
        processed++;
      }
    }

    setStatus(`Selesai! ${newCount} baru ditambahkan, ${updatedCount} data di-update (field kosong diisi).`);
    setImporting(false);
  };

  // Build an update object with only fields that are non-empty in new data AND empty/missing in existing data
  function buildMergeUpdate(existingData, newCandidate) {
    const update = {};
    const ARRAY_FIELDS = ["keluarga", "pekerjaan"];
    const SKIP_FIELDS = ["importedAt", "submittedAt"];

    for (const [key, newValue] of Object.entries(newCandidate)) {
      if (SKIP_FIELDS.includes(key)) continue;

      if (ARRAY_FIELDS.includes(key)) {
        // Merge array fields at item level
        const existingArr = existingData[key] || [];
        const newArr = newValue || [];
        if (!Array.isArray(newArr) || newArr.length === 0) continue;

        const mergedArr = [...existingArr];
        let arrayChanged = false;

        for (let i = 0; i < newArr.length; i++) {
          const newItem = newArr[i];
          if (!newItem || typeof newItem !== "object") continue;

          // Check if new item has any non-empty values
          const hasNewData = Object.values(newItem).some((v) => v && String(v).trim() !== "");
          if (!hasNewData) continue;

          if (i < mergedArr.length) {
            // Existing item at this index - fill in empty sub-fields
            const existingItem = mergedArr[i] || {};
            let itemChanged = false;
            const mergedItem = { ...existingItem };

            for (const [subKey, subValue] of Object.entries(newItem)) {
              if (subValue && String(subValue).trim() !== "") {
                const existingSubValue = existingItem[subKey];
                if (!existingSubValue || String(existingSubValue).trim() === "") {
                  mergedItem[subKey] = subValue;
                  itemChanged = true;
                }
              }
            }

            if (itemChanged) {
              mergedArr[i] = mergedItem;
              arrayChanged = true;
            }
          } else {
            // New item beyond existing array length - append
            mergedArr.push(newItem);
            arrayChanged = true;
          }
        }

        if (arrayChanged) {
          update[key] = mergedArr;
        }
      } else {
        // Scalar fields: only fill if existing is empty/missing and new has data
        if (newValue && String(newValue).trim() !== "") {
          const existingValue = existingData[key];
          if (!existingValue || String(existingValue).trim() === "") {
            update[key] = newValue;
          }
        }
      }
    }

    return update;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Import Data dari Google Sheets</h1>
        <p className="text-gray-500 text-sm mb-6">
          Tarik data langsung dari spreadsheet via API, atau upload CSV manual.
        </p>

        {/* Method 1: Direct API */}
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Metode 1: Langsung dari Google Sheets (API)</h2>
          <p className="text-xs text-gray-500 mb-3">
            Pastikan spreadsheet sudah di-share: Anyone with the link → Viewer
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Spreadsheet ID</label>
              <input
                className="input-field text-xs"
                value={customSheetId}
                onChange={(e) => setCustomSheetId(e.target.value)}
                placeholder="ID dari URL spreadsheet"
              />
            </div>
            <div>
              <label className="form-label">Nama Sheet</label>
              <select
                className="input-field"
                value={customSheetName}
                onChange={(e) => setCustomSheetName(e.target.value)}
              >
                {SHEET_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                className="input-field mt-2 text-xs"
                value={customSheetName}
                onChange={(e) => setCustomSheetName(e.target.value)}
                placeholder="Atau ketik nama sheet manual"
              />
            </div>
          </div>
          <button onClick={fetchFromSheets} className="btn-primary" disabled={fetching}>
            {fetching ? "Mengambil data..." : "Fetch Data dari Spreadsheet"}
          </button>
        </div>

        {/* Method 2: CSV Upload */}
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Metode 2: Upload CSV Manual</h2>
          <p className="text-xs text-gray-500 mb-3">
            Download sheet sebagai CSV lalu upload di sini.
          </p>
          <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="input-field" />
        </div>

        {/* Header Mapping Preview */}
        {headerMapping && (
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Header Mapping Preview</h2>
            <p className="text-xs text-gray-500 mb-3">
              Menampilkan hasil identifikasi kolom dari sheet. Sistem mencocokkan header kolom ke field standar (Form Responses 3).
            </p>
            
            {/* Matched headers */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-green-700 mb-2">
                Berhasil Dikenali ({headerMapping.matched.length} kolom)
              </h3>
              <div className="max-h-[200px] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {headerMapping.matched.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs py-1 px-2 bg-green-50 rounded">
                      <span className="text-green-600 font-bold">&#10003;</span>
                      <span className="text-gray-600 truncate" title={m.header}>{m.header.length > 35 ? m.header.substring(0, 35) + "..." : m.header}</span>
                      <span className="text-gray-400">&#8594;</span>
                      <span className="text-green-700 font-medium">{m.field}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Unmatched headers */}
            {headerMapping.unmatched.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-orange-700 mb-2">
                  Tidak Dikenali ({headerMapping.unmatched.length} kolom)
                </h3>
                <div className="max-h-[150px] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {headerMapping.unmatched.map((u, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs py-1 px-2 bg-orange-50 rounded">
                        <span className="text-orange-500 font-bold">?</span>
                        <span className="text-gray-600 truncate" title={u.header}>{u.header.length > 50 ? u.header.substring(0, 50) + "..." : u.header}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Kolom yang tidak dikenali akan diabaikan saat import. Data tetap bisa diimport untuk kolom yang berhasil di-mapping.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Preview Data ({preview.length} kandidat)</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 sticky top-0">
                    <th className="py-2 px-2 text-left">No</th>
                    <th className="py-2 px-2 text-left">Nama</th>
                    <th className="py-2 px-2 text-left">Kategori</th>
                    <th className="py-2 px-2 text-left">Bidang</th>
                    <th className="py-2 px-2 text-left">No HP</th>
                    <th className="py-2 px-2 text-left">Kode Job</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-1 px-2">{idx + 1}</td>
                      <td className="py-1 px-2 font-medium">{p.namaLengkap}</td>
                      <td className="py-1 px-2">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">{p.kategoriKandidat}</span>
                      </td>
                      <td className="py-1 px-2">{p.bidangKerja}</td>
                      <td className="py-1 px-2">{p.noHp}</td>
                      <td className="py-1 px-2">{p.kodeJob}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">{preview.length} data siap diimport</span>
              <button onClick={handleImport} className="btn-primary" disabled={importing}>
                {importing ? "Mengimport..." : `Import ${preview.length} Data ke Firestore`}
              </button>
            </div>
          </div>
        )}

        {status && (
          <div className={`border px-4 py-3 rounded-lg text-sm ${status.includes("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
            {status}
          </div>
        )}
      </div>
    </>
  );
}
