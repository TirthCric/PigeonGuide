// app/api/generate-resume-pdf/route.js
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Define the POST handler for this API route
export async function POST(request) {
  try {
    // Parse the request body to get the HTML content
    const { htmlContent } = await request.json();

    if (!htmlContent) {
      return NextResponse.json(
        { message: 'HTML content is required.' },
        { status: 400 }
      );
    }

    let browser;
    try {
      // Launch a headless browser instance
      // 'new' is the modern headless mode.
      // 'args' are crucial for deployment environments like Vercel, Docker, etc.
      browser = await puppeteer.launch({
        headless: 'new', // Use 'new' for the new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Recommended for Docker/low-memory environments
        ],
      });

      const page = await browser.newPage();

      // Set the HTML content of the page
      // `waitUntil: 'networkidle0'` waits until there are no more than 0 network connections for at least 500 ms.
      // This helps ensure all images, fonts, and other assets are loaded.
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 60000, // Increase timeout if your resume is very complex/slow to load
      });

      // Optional: Add a small delay if you have animations or very complex CSS that needs a moment to settle
      // await new Promise(resolve => setTimeout(resolve, 500));

      // Generate the PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true, // Include background colors and images
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm',
        },
        // You can add headers/footers for page numbers, etc.
        // displayHeaderFooter: true,
        // headerTemplate: `<div style="font-size: 10px; margin-left: 20mm;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
        // footerTemplate: `<div style="font-size: 10px; margin-left: 20mm;">My Resume</div>`,
      });

      // Return the PDF buffer as a response
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="resume.pdf"',
        },
      });
    } finally {
      // Ensure the browser is closed to free up resources
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    // Return an error response
    return NextResponse.json(
      { message: 'Failed to generate PDF. Internal server error.', error: error.message },
      { status: 500 }
    );
  }
}

// Optionally, define other HTTP methods if needed, e.g., for error handling on incorrect methods
export async function GET() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}