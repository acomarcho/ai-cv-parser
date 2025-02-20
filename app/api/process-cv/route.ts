import { NextRequest, NextResponse } from "next/server";
import { fromBuffer } from "pdf2pic";
import OpenAI from "openai";
import { z } from "zod";

const CVSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().regex(/^\+628\d{8,11}$/, "Phone must be in format +628xxx"),
});

export async function POST(request: NextRequest) {
  try {
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const pdfBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(pdfBuffer);

    console.time("Image processing");
    const options = {
      density: 100,
      format: "jpg",
      width: 2048,
      preserveAspectRatio: true,
    };
    const convert = fromBuffer(buffer, options);
    const image = await convert(1, { responseType: "base64" });
    console.timeEnd("Image processing");

    console.time("OpenAI API call");
    const response = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that extracts information from a CV.
            
            You will be given a CV image.
            
            You will need to extract the following information:
            - Name
            - Email
            - Phone number
            
            Format the phone number to local Indonesian phone number, in form of +628xxx.
            For example, 081228051404 becomes +6281228051404.
            
            Example:
            {
              "name": "Marchotridyo",
              "email": "marchotridyo@gmail.com",
              "phone": "+6281234567890"
            }`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this following CV image",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image.base64}`,
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cv",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the person",
              },
              email: {
                type: "string",
                description: "Email of the person",
              },
              phone: {
                type: "string",
                description:
                  "Phone number of the person, formatted in +628xxx, example 081228051404 becomes +6281228051404",
              },
            },
            required: ["name", "email", "phone"],
            additionalProperties: false,
          },
        },
      },
    });
    console.timeEnd("OpenAI API call");

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }

    const parsedContent = JSON.parse(content);
    const validatedData = CVSchema.parse(parsedContent);

    return NextResponse.json({ data: validatedData });
  } catch (error) {
    console.error("Error processing CV:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data format", details: error.errors },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Failed to process CV" },
      { status: 500 }
    );
  }
}
