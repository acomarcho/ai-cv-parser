"use client";

import { useState, useCallback, Fragment } from "react";
import { useDropzone } from "react-dropzone";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function FileUploadZone() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successfulFiles, setSuccessfulFiles] = useState<File[]>([]);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter only PDF files
    const pdfFiles = acceptedFiles.filter(
      (file) => file.type === "application/pdf"
    );
    setFiles([...pdfFiles]);
    // Reset success/failure states when new files are dropped
    setSuccessfulFiles([]);
    setFailedFiles([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  const processCvs = async () => {
    setIsProcessing(true);
    // Reset success/failure states at the start of processing
    setSuccessfulFiles([]);
    setFailedFiles([]);

    // Process files in chunks of 10
    for (let i = 0; i < files.length; i += 10) {
      const chunk = files.slice(i, i + 10);
      const promises = chunk.map(async (file) => {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/process-cv", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to process CV");
          }

          const result = await response.json();
          toast.success(`Successfully processed ${file.name}`);
          setSuccessfulFiles((prev) => [...prev, file]);
          return result;
        } catch {
          toast.error(`Failed to process ${file.name}`);
          setFailedFiles((prev) => [...prev, file]);
        }
      });

      await Promise.all(promises);
    }

    setIsProcessing(false);
  };

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
        <div className="mt-4 space-y-4">
          <Disclosure as="div">
            {({ open }) => (
              <>
                <DisclosureButton className="flex w-full justify-between rounded-lg bg-stone-100 px-4 py-3 text-left text-sm font-medium text-stone-700 hover:bg-stone-200 focus:outline-none focus-visible:ring focus-visible:ring-stone-500 focus-visible:ring-opacity-75">
                  <span>Uploaded files ({files.length})</span>
                  <ChevronDown
                    className={`${
                      open ? "transform rotate-180" : ""
                    } h-5 w-5 text-stone-500 transition-transform duration-200`}
                  />
                </DisclosureButton>
                <Transition
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <DisclosurePanel static as={Fragment}>
                    <div className="bg-white rounded-lg shadow-sm border border-stone-200 px-4 pt-4 pb-2">
                      <ul className="space-y-1">
                        {files.map((file, index) => (
                          <li key={index} className="text-stone-600">
                            {file.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </DisclosurePanel>
                </Transition>
              </>
            )}
          </Disclosure>

          {successfulFiles.length > 0 && (
            <Disclosure as="div">
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full justify-between rounded-lg bg-green-50 px-4 py-3 text-left text-sm font-medium text-green-700 hover:bg-green-100 focus:outline-none focus-visible:ring focus-visible:ring-green-500 focus-visible:ring-opacity-75">
                    <span>
                      Successfully processed ({successfulFiles.length})
                    </span>
                    <ChevronDown
                      className={`${
                        open ? "transform rotate-180" : ""
                      } h-5 w-5 text-green-500 transition-transform duration-200`}
                    />
                  </DisclosureButton>
                  <Transition
                    show={open}
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <DisclosurePanel static as={Fragment}>
                      <div className="bg-white rounded-lg shadow-sm border border-green-200 px-4 pt-4 pb-2">
                        <ul className="space-y-1">
                          {successfulFiles.map((file, index) => (
                            <li key={index} className="text-green-600">
                              {file.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </DisclosurePanel>
                  </Transition>
                </>
              )}
            </Disclosure>
          )}

          {failedFiles.length > 0 && (
            <Disclosure as="div">
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full justify-between rounded-lg bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus-visible:ring focus-visible:ring-red-500 focus-visible:ring-opacity-75">
                    <span>Failed to process ({failedFiles.length})</span>
                    <ChevronDown
                      className={`${
                        open ? "transform rotate-180" : ""
                      } h-5 w-5 text-red-500 transition-transform duration-200`}
                    />
                  </DisclosureButton>
                  <Transition
                    show={open}
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <DisclosurePanel static as={Fragment}>
                      <div className="bg-white rounded-lg shadow-sm border border-red-200 px-4 pt-4 pb-2">
                        <ul className="space-y-1">
                          {failedFiles.map((file, index) => (
                            <li key={index} className="text-red-600">
                              {file.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </DisclosurePanel>
                  </Transition>
                </>
              )}
            </Disclosure>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          disabled={files.length === 0 || isProcessing}
          className={`
          mt-4 px-4 py-2 rounded-lg
          transition-colors duration-200
          ${
            files.length === 0 || isProcessing
              ? "bg-stone-300 cursor-not-allowed text-stone-500"
              : "bg-stone-800 text-white hover:bg-stone-600 active:bg-stone-700"
          }
        `}
          onClick={processCvs}
        >
          {isProcessing ? "Processing..." : "Process CVs"}
        </button>
      </div>
    </div>
  );
}
