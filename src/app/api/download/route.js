import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  let filename = searchParams.get("filename") || "document";

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch from source: ${response.status}`);

    const contentType = response.headers.get("content-type");
    const arrayBuffer = await response.arrayBuffer();

    // Extract extension from content-type or original URL
    let extension = "";
    if (contentType) {
      const mimeMap = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'application/pdf': 'pdf',
        'image/heic': 'heic',
        'image/heif': 'heic'
      };
      extension = mimeMap[contentType] || "";
    }

    if (!extension) {
      extension = url.split(/[#?]/)[0].split('.').pop().trim().toLowerCase();
      if (extension.length > 4) extension = "file";
    }

    const fullFilename = extension ? `${filename}.${extension}` : filename;

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fullFilename.replace(/\s+/g, '_')}"`,
      },
    });
  } catch (err) {
    console.error("Download proxy error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
