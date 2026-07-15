import { NextResponse } from "next/server";

// Extract Google Drive file ID from various URL formats
function extractFileId(url) {
  if (!url) return null;
  const patterns = [
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Convert date string (YYYY/MM/DD or YYYY-MM-DD) to Japanese format
function toJapaneseDate(dateStr) {
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    return `${parts[0]}年${parts[1]}月${parts[2]}日`;
  }
  return dateStr;
}

// Find dates in text and return the last one in Japanese format
// Also checks for Japanese date patterns (YYYY年MM月DD日) directly in OCR text
function findDatesInText(text) {
  // First, try to find Japanese date patterns directly (YYYY年MM月DD日)
  const japaneseDatePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  const japaneseDates = [...text.matchAll(japaneseDatePattern)];

  if (japaneseDates.length > 0) {
    // Take the LAST Japanese date found
    const lastMatch = japaneseDates[japaneseDates.length - 1];
    const year = lastMatch[1];
    const month = lastMatch[2].padStart(2, "0");
    const day = lastMatch[3].padStart(2, "0");
    const japaneseDate = `${year}年${month}月${day}日`;

    return {
      date: japaneseDate,
      rawDate: `${year}/${month}/${day}`,
      totalDatesFound: japaneseDates.length,
    };
  }

  // Then try standard date patterns (YYYY/MM/DD or YYYY-MM-DD)
  const datePattern = /\d{4}[\/\-]\d{2}[\/\-]\d{2}/g;
  const allDates = text.match(datePattern);

  if (!allDates || allDates.length === 0) {
    return null;
  }

  // Take the LAST date found (avoids birth dates, matches Apps Script logic)
  const lastDate = allDates[allDates.length - 1];
  const japaneseDate = toJapaneseDate(lastDate);

  return {
    date: japaneseDate,
    rawDate: lastDate,
    totalDatesFound: allDates.length,
  };
}

// Perform OCR using OCR.space API (free tier: 25,000 requests/month)
async function performOcrWithOcrSpace(downloadUrl) {
  if (!process.env.OCR_SPACE_API_KEY) {
    return {
      error:
        "OCR_SPACE_API_KEY belum dikonfigurasi. Dapatkan API key gratis di https://ocr.space/ocrapi/freekey lalu set sebagai environment variable.",
    };
  }

  try {
    const formData = new FormData();
    formData.append("url", downloadUrl);
    formData.append("language", "jpn");
    formData.append("isOverlayRequired", "false");
    formData.append("OCREngine", "2");
    formData.append("filetype", "PDF");

    const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: process.env.OCR_SPACE_API_KEY,
      },
      body: formData,
    });

    if (!ocrResponse.ok) {
      return {
        error: `OCR.space API error: HTTP ${ocrResponse.status}`,
      };
    }

    const result = await ocrResponse.json();

    if (result.IsErroredOnProcessing) {
      const errorMessage =
        result.ErrorMessage?.[0] || result.ErrorDetails || "Unknown OCR error";
      return {
        error: `OCR gagal memproses file: ${errorMessage}`,
      };
    }

    if (
      !result.ParsedResults ||
      result.ParsedResults.length === 0 ||
      !result.ParsedResults[0].ParsedText
    ) {
      return { text: "" };
    }

    return { text: result.ParsedResults[0].ParsedText };
  } catch (ocrErr) {
    return {
      error: `Gagal melakukan OCR via OCR.space: ${ocrErr.message}`,
    };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !url.includes("http")) {
      return NextResponse.json(
        { success: false, error: "URL tidak valid atau kosong" },
        { status: 400 }
      );
    }

    const fileId = extractFileId(url);
    const isGoogleDrive = url.includes("drive.google.com");

    // Determine download URL
    // If it's Google Drive, use the direct download proxy
    // If it's a direct link (like Firebase), use the URL as-is
    const downloadUrl = (isGoogleDrive && fileId)
      ? `https://drive.google.com/uc?export=download&id=${fileId}`
      : url;

    let pdfBuffer;

    try {
      const response = await fetch(downloadUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `Gagal mendownload file: HTTP ${response.status}` },
          { status: 422 }
        );
      }

      const contentType = response.headers.get("content-type") || "";

      // Handle Google Drive virus scan warning page for large files
      if (isGoogleDrive && contentType.includes("text/html")) {
        const html = await response.text();

        // Try to find the confirm download link
        const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
        if (confirmMatch) {
          const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
          const confirmResponse = await fetch(confirmUrl, {
            redirect: "follow",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });
          if (!confirmResponse.ok) {
            return NextResponse.json(
              { success: false, error: "Gagal mendownload file setelah konfirmasi virus scan" },
              { status: 422 }
            );
          }
          const arrayBuf = await confirmResponse.arrayBuffer();
          pdfBuffer = Buffer.from(arrayBuf);
        } else {
          // Could not find confirm token - file might not be publicly shared
          return NextResponse.json(
            { success: false, error: "File tidak dapat diakses. Pastikan file dishare secara publik di Google Drive." },
            { status: 422 }
          );
        }
      } else {
        const arrayBuf = await response.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuf);
      }
    } catch (fetchErr) {
      return NextResponse.json(
        { success: false, error: `Gagal mendownload PDF: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    // Parse PDF and extract text
    let pdfText;
    try {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse")).default;
      const pdfData = await pdfParse(pdfBuffer);
      pdfText = pdfData.text;
    } catch (parseErr) {
      return NextResponse.json(
        { success: false, error: `Gagal membaca PDF: ${parseErr.message}` },
        { status: 422 }
      );
    }

    // If pdf-parse extracted text, try to find dates
    if (pdfText && pdfText.trim().length > 0) {
      const dateResult = findDatesInText(pdfText);
      if (dateResult) {
        return NextResponse.json({
          success: true,
          ...dateResult,
          method: "text",
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: "Tidak ditemukan tanggal dalam format YYYY/MM/DD atau YYYY-MM-DD di PDF",
        },
        { status: 422 }
      );
    }

    // Fallback: PDF is image/scanned - try OCR via OCR.space API
    const ocrResult = await performOcrWithOcrSpace(downloadUrl);

    if (ocrResult.error) {
      return NextResponse.json(
        { success: false, error: ocrResult.error },
        { status: 422 }
      );
    }

    const ocrText = ocrResult.text;

    if (!ocrText || ocrText.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "PDF berupa gambar/scan dan OCR tidak berhasil mengekstrak teks. Silakan isi manual.",
        },
        { status: 422 }
      );
    }

    // Try to find dates in the OCR text
    const dateResult = findDatesInText(ocrText);
    if (dateResult) {
      return NextResponse.json({
        success: true,
        ...dateResult,
        method: "ocr",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "OCR berhasil membaca teks, tetapi tidak ditemukan tanggal dalam format YYYY/MM/DD atau YYYY-MM-DD. Silakan isi manual.",
      },
      { status: 422 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `Server error: ${err.message}` },
      { status: 500 }
    );
  }
}
