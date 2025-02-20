"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

export default function FileUploadZone() {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter only PDF files
    const pdfFiles = acceptedFiles.filter(
      (file) => file.type === "application/pdf"
    );
    setFiles((prev) => [...prev, ...pdfFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  return (
    <div className="mt-8">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8
          transition-colors duration-200 ease-in-out
          flex flex-col items-center justify-center
          min-h-[200px] cursor-pointer
          ${
            isDragActive
              ? "border-stone-600 bg-stone-50"
              : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"
          }
        `}
      >
        <input {...getInputProps()} />
        <p className="text-stone-600 text-center">
          {isDragActive
            ? "Drop your PDF files here..."
            : "Drop one or more PDF files here, or click to select files"}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-stone-700 font-medium mb-2">Uploaded files:</h3>
          <ul className="space-y-1">
            {files.map((file, index) => (
              <li key={index} className="text-stone-600">
                {file.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
