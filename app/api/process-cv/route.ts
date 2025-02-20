import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // TODO: Add your CV processing logic here
    console.log("Processing file:", file);

    return NextResponse.json({ message: "CV processed successfully" });
  } catch (error) {
    console.error("Error processing CV:", error);
    return NextResponse.json(
      { error: "Failed to process CV" },
      { status: 500 }
    );
  }
}
