import * as XLSX from "xlsx";

export const readExcel = (file: File, targetSheet?: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) return resolve([]);

                const workbook = XLSX.read(data, { type: "array" });
                // If a target sheet name is provided, try to find it; otherwise use the first sheet
                const sheetName = targetSheet && workbook.SheetNames.includes(targetSheet)
                    ? targetSheet
                    : workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Use sheet_to_json with default options which reads headers
                const jsonData = XLSX.utils.sheet_to_json(sheet);
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const readExcelRequiredSheet = (file: File, targetSheet: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) return resolve([]);

                const workbook = XLSX.read(data, { type: "array" });

                if (!workbook.SheetNames.includes(targetSheet)) {
                    reject(new Error(`Không tìm thấy sheet "${targetSheet}"`));
                    return;
                }

                const sheet = workbook.Sheets[targetSheet];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const exportExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportMultiSheetExcel = (sheets: { sheetName: string; data: any[] }[], fileName: string) => {
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
    });

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Export Excel with multiple sheets, supporting both JSON and raw array-of-arrays (aoa) sheets.
 * Use `type: 'aoa'` for sheets that need full row-level control (e.g., instruction/guide sheets).
 */
export const exportMultiSheetExcelAdvanced = (
    sheets: ({ sheetName: string; type?: 'json'; data: any[] } | { sheetName: string; type: 'aoa'; data: any[][] })[],
    fileName: string,
    colWidths?: { wch: number }[][]
) => {
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet, i) => {
        let worksheet: XLSX.WorkSheet;
        if (sheet.type === 'aoa') {
            worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
        } else {
            worksheet = XLSX.utils.json_to_sheet(sheet.data);
        }
        if (colWidths && colWidths[i]) {
            worksheet['!cols'] = colWidths[i];
        }
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
    });

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
