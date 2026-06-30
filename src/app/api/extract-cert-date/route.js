import { NextResponse } from "next/server";
import { google } from "googleapis";

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
function findDatesInText(text) {
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

// Perform OCR using Google Drive API (copy as Google Doc, export as text)
async function performOcrWithGoogleDrive(fileId) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return {
      error:
        "GOOGLE_SERVICE_ACCOUNT_JSON belum dikonfigurasi. Silakan set environment variable dengan credential Google Service Account untuk mengaktifkan OCR pada PDF gambar/scan.",
    };
  }

  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch (parseErr) {
    return {
      error:
        "GOOGLE_SERVICE_ACCOUNT_JSON tidak valid (bukan JSON). Periksa konfigurasi environment variable.",
    };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });
  let newDocId = null;

  try {
    // Copy the PDF file as a Google Doc (this triggers OCR)
    const copyResponse = await drive.files.copy({
      fileId,
      requestBody: {
        mimeType: "application/vnd.google-apps.document",
      },
    });
    newDocId = copyResponse.data.id;

    // Export the Google Doc as plain text
    const exportResponse = await drive.files.export({
      fileId: newDocId,
      mimeType: "text/plain",
    });

    const ocrText = exportResponse.data;
    return { text: ocrText };
  } catch (driveErr) {
    const status = driveErr?.code || driveErr?.response?.status;
    if (status === 403 || status === 404) {
      return {
        error: `File tidak dapat diakses oleh service account. Pastikan file di-share dengan email service account (lihat field "client_email" di GOOGLE_SERVICE_ACCOUNT_JSON). Error: ${driveErr.message}`,
      };
    }
    return {
      error: `Gagal melakukan OCR via Google Drive: ${driveErr.message}`,
    };
  } finally {
    // Always try to delete the temporary Google Doc
    if (newDocId) {
      try {
        await drive.files.delete({ fileId: newDocId });
      } catch (deleteErr) {
        console.warn(
          `Failed to delete temporary Google Doc (ID: ${newDocId}). It may remain as an orphaned file. Error: ${deleteErr.message}`
        );
      }
    }
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

    // Fallback: PDF is image/scanned - try OCR via Google Drive API
    const ocrResult = await performOcrWithGoogleDrive(fileId);

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
