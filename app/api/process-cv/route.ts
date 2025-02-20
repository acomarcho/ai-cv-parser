import { NextRequest, NextResponse } from "next/server";
import { fromBuffer } from "pdf2pic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const pdfBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(pdfBuffer);

    const options = {
      density: 100,
      format: "jpg",
      width: 2048,
      preserveAspectRatio: true,
    };
    const convert = fromBuffer(buffer, options);
    const images = await convert(1);
    console.log(images);

    return NextResponse.json({ message: "CV processed successfully" });
  } catch (error) {
    console.error("Error processing CV:", error);
    return NextResponse.json(
      { error: "Failed to process CV" },
      { status: 500 }
    );
  }
}
