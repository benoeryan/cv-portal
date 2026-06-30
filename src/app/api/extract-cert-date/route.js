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
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "Tidak dapat mengekstrak file ID dari URL" },
        { status: 400 }
      );
    }

    // Download PDF from Google Drive using direct download URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
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
      if (contentType.includes("text/html")) {
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
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(pdfBuffer);
      pdfText = pdfData.text;
    } catch (parseErr) {
      return NextResponse.json(
        { success: false, error: `Gagal membaca PDF: ${parseErr.message}` },
        { status: 422 }
      );
    }

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "PDF tidak mengandung teks yang dapat diekstrak" },
        { status: 422 }
      );
    }

    // Find all date patterns (YYYY/MM/DD or YYYY-MM-DD)
    const datePattern = /\d{4}[\/\-]\d{2}[\/\-]\d{2}/g;
    const allDates = pdfText.match(datePattern);

    if (!allDates || allDates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Tidak ditemukan tanggal dalam format YYYY/MM/DD atau YYYY-MM-DD di PDF",
        },
        { status: 422 }
      );
    }

    // Take the LAST date found (avoids birth dates, matches Apps Script logic)
    const lastDate = allDates[allDates.length - 1];
    const japaneseDate = toJapaneseDate(lastDate);

    return NextResponse.json({
      success: true,
      date: japaneseDate,
      rawDate: lastDate,
      totalDatesFound: allDates.length,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `Server error: ${err.message}` },
      { status: 500 }
    );
  }
}
