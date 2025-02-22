// ./src/server/utils/pdfToImages.ts
import { fromPath } from "pdf2pic";
import { randomUUID } from "crypto";
import { uploadToS3 } from "./s3";
import { env } from "~/env";

/**
 * Convert each page of a PDF into PNG images and store them in S3.
 * Returns an array of S3 URLs, one per page.
 */
export async function convertPdfToImagesAndUpload(
  pdfBuffer: Buffer,
  bucketName: string,
  baseS3Folder: string,
): Promise<string[]> {
  // Save locally as a temp file
  // pdf2pic library requires a path
  const tempPdfPath = `/tmp/${randomUUID()}.pdf`;
  await import("fs").then(fs =>
    fs.writeFileSync(tempPdfPath, pdfBuffer)
  );

  // Configure pdf2pic
  const converter = fromPath(tempPdfPath, {
    density: 150,
    savePath: "/tmp", // temporary images
    format: "png",
    width: 1024, // adjust as needed
    height: 1024,
  });

  const pdfInfo = await converter.info();
  const totalPages = pdfInfo.pages;

  const imageUrls: string[] = [];

  // Convert each page
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const output = await converter(pageNumber);
    // The library’s output has a name & path to the generated PNG
    // We read that file into a buffer:
    const imageData = await import("fs").then(fs =>
      fs.readFileSync(output.path)
    );

    // Construct an S3 key
    const key = `${baseS3Folder}/page-${pageNumber}-${randomUUID()}.png`;

    // Upload to S3
    const imageUrl = await uploadToS3(
      bucketName,
      key,
      imageData,
      "image/png",
    );
    imageUrls.push(imageUrl);
  }

  return imageUrls;
}
