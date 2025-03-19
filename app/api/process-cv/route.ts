import { NextRequest, NextResponse } from "next/server";
import { fromBuffer } from "pdf2pic";
import OpenAI from "openai";
import { z } from "zod";
import { appendToSheet } from "@/utils/sheets";

const CVSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  companies: z.array(z.string()),
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

    const options = {
      density: 100,
      format: "jpg",
      width: 2048,
      preserveAspectRatio: true,
    };
    const convert = fromBuffer(buffer, options);
    const images = await convert.bulk(-1, { responseType: "base64" });

    // Process each page and extract text
    const pageTexts = await Promise.all(
      images.map(async (image) => {
        const response = await openai.chat.completions.create({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant that extracts text from CV images.

                Extract all the text content from the CV image and format it in a clean, readable way.
                Preserve the structure and formatting of the original CV.
                Return the text content in markdown format.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all text from this CV page",
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
        });

        return response.choices[0].message.content || "";
      })
    );

    // Combine all page texts into a single markdown document
    const fullCVText = pageTexts.join("\n\n---\n\n");

    // Now process the consolidated CV text to extract structured information
    const extractionResponse = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that extracts information from a CV.
            
            You will be given a CV in markdown format.
            
            You will need to extract the following information:
            - Name
            - Email
            - Phone number
            - Companies
            
            Format the phone number to local Indonesian phone number, in form of +628xxx.
            For example, 081228051404 becomes +6281228051404.
            
            Example:
            {
              "name": "Marchotridyo",
              "email": "marchotridyo@gmail.com",
              "phone": "+6281234567890",
              "companies": ["PT. A", "PT. B", "PT. C"]
            }
              
            Any fields that you cannot convert should be returned as "N/A".`,
        },
        {
          role: "user",
          content: fullCVText,
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
                description:
                  "Email of the person. If the email is not found, return N/A.",
              },
              phone: {
                type: "string",
                description:
                  "Phone number of the person, formatted in +628xxx, example 081228051404 becomes +6281228051404. If the phone number is not found, return N/A. If the phone number also is not an Indonesian phone number, return N/A.",
              },
              companies: {
                type: "array",
                description:
                  "Companies that the person has worked at. If there are no companies, return an empty array ([]).",
                items: {
                  type: "string",
                },
              },
            },
            required: ["name", "email", "phone", "companies"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = extractionResponse.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }

    const parsedContent = JSON.parse(content);
    const validatedData = CVSchema.parse(parsedContent);

    await appendToSheet(validatedData);

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
