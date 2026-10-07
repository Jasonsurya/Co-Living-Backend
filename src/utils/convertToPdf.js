const { execFile } = require("child_process");
const path = require("path");

const SOFFICE_PATH =
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

const convertToPdf = (docxPath) => {
    return new Promise((resolve, reject) => {
        const outputDir = path.dirname(docxPath);

        execFile(
            SOFFICE_PATH,
            [
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                outputDir,
                docxPath,
            ],
            (error, stdout, stderr) => {
                if (error) {
                    console.error("Gagal convert DOCX ke PDF:");
                    console.error(stderr);

                    return reject(error);
                }

                console.log("Hasil convert LibreOffice:");
                console.log(stdout);

                const namaPdf =
                    path.basename(
                        docxPath,
                        path.extname(docxPath)
                    ) + ".pdf";

                const pdfPath = path.join(
                    outputDir,
                    namaPdf
                );

                resolve(pdfPath);
            }
        );
    });
};

module.exports = {
    convertToPdf,
};