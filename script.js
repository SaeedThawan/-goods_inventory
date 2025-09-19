// اسم ورقة العمل التي قمنا بتصميمها
const SHEET_NAME = "VisitsData";

// معرّف (ID) مجلد Google Drive لرفع المرفقات.
// قم بتغيير هذا المعرف إلى معرّف المجلد الخاص بك
const ATTACHMENTS_FOLDER_ID = "YOUR_ATTACHMENTS_FOLDER_ID_HERE";

/**
 * دالة لمعالجة طلبات POST من النموذج.
 * @param {Object} e - بيانات الطلب.
 * @returns {TextOutput} - رد نصي بسيط.
 */
function doPost(e) {
    try {
        if (!e || !e.parameter) {
            Logger.log('❌ لا توجد بيانات في الطلب');
            return ContentService.createTextOutput("Error: No data received.");
        }

        const data = e.parameter;
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
        if (!sheet) {
            Logger.log('❌ ورقة العمل غير موجودة');
            return ContentService.createTextOutput(`Error: Sheet "${SHEET_NAME}" not found.`);
        }

        // حساب مدة الزيارة
        let durationInMinutes = "";
        if (data.visitDate && data.visitTime && data.exitTime) {
            const visitDateTime = new Date(`${data.visitDate}T${data.visitTime}:00`);
            const exitDateTime = new Date(`${data.visitDate}T${data.exitTime}:00`);

            if (visitDateTime >= exitDateTime) {
                Logger.log('❌ وقت الخروج لا يمكن أن يسبق أو يساوي وقت الدخول');
                return ContentService.createTextOutput("Error: Exit time must be after visit time.");
            }
            durationInMinutes = ((exitDateTime - visitDateTime) / (1000 * 60)).toFixed(2);

            if (durationInMinutes > 300) {
                Logger.log('❌ مدة الزيارة تجاوزت 5 ساعات.');
                return ContentService.createTextOutput("Duration constraint violation: Visit duration cannot exceed 5 hours.");
            }
        }

        let attachmentLink = "";

        const productsData = data.products ? JSON.parse(data.products) : [];
        const productsToSend = productsData.length > 0 ? productsData : [{
            name: '',
            code: '',
            category: '',
            quantity: '',
            unit: '',
            expiry: ''
        }];

        // ** منطق تجميع المنتجات الجديدة هنا **
        const aggregatedProducts = {};
        productsToSend.forEach(product => {
            const productKey = product.name;
            if (!aggregatedProducts[productKey]) {
                aggregatedProducts[productKey] = {
                    name: product.name,
                    code: product.code,
                    category: product.category,
                    expiry: product.expiry,
                    units: {}
                };
            }
            const unit = product.unit || 'UndefinedUnit';
            const quantity = parseInt(product.quantity) || 0;
            if (aggregatedProducts[productKey].units[unit]) {
                aggregatedProducts[productKey].units[unit] += quantity;
            } else {
                aggregatedProducts[productKey].units[unit] = quantity;
            }
        });

        const finalProductsList = Object.values(aggregatedProducts);

        // ** تعديل الأعمدة الديناميكية لتدعم الوحدات المختلفة **
        let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        let headersMap = {};
        headers.forEach((header, index) => {
            headersMap[header.trim()] = index;
        });

        const dynamicHeaders = ['submissionDate', 'dataEntryName', 'salesRepName', 'customerCode', 'customerName', 'governorate', 'region', 'visitDate', 'visitTime', 'exitTime', 'visitDuration', 'storeRating', 'suggestions', 'attachmentLink', 'latitude', 'longitude', 'productName', 'missingProductCode', 'productCategory', 'productExpiry'];
        
        finalProductsList.forEach(product => {
            for (const unit in product.units) {
                const quantityHeader = `productQuantity_${unit}`;
                if (!dynamicHeaders.includes(quantityHeader)) {
                    dynamicHeaders.push(quantityHeader);
                }
            }
        });

        dynamicHeaders.forEach(headerKey => {
            if (!headersMap.hasOwnProperty(headerKey)) {
                const lastColumn = sheet.getLastColumn();
                sheet.insertColumnAfter(lastColumn);
                sheet.getRange(1, lastColumn + 1).setValue(headerKey);
                headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
                headersMap = {};
                headers.forEach((header, index) => {
                    headersMap[header.trim()] = index;
                });
            }
        });

        let rowsInserted = 0;
        finalProductsList.forEach(product => {
            const newRow = new Array(headers.length).fill('');
            
            newRow[headersMap['submissionDate']] = new Date();
            newRow[headersMap['dataEntryName']] = data.dataEntryName || '';
            newRow[headersMap['salesRepName']] = data.salesRepName || '';
            newRow[headersMap['customerCode']] = data.customerCode || '';
            newRow[headersMap['customerName']] = data.customerName || '';
            newRow[headersMap['governorate']] = data.governorate || '';
            newRow[headersMap['region']] = data.region || '';
            newRow[headersMap['visitDate']] = data.visitDate || '';
            newRow[headersMap['visitTime']] = data.visitTime || '';
            newRow[headersMap['exitTime']] = data.exitTime || '';
            newRow[headersMap['visitDuration']] = durationInMinutes;
            newRow[headersMap['storeRating']] = data.storeRating || '';
            newRow[headersMap['suggestions']] = data.suggestions || '';
            newRow[headersMap['attachmentLink']] = attachmentLink || '';
            
            newRow[headersMap['latitude']] = data.latitude || '';
            newRow[headersMap['longitude']] = data.longitude || '';

            // إضافة بيانات المنتجات المجمّعة
            newRow[headersMap['productName']] = product.name;
            newRow[headersMap['missingProductCode']] = product.code;
            newRow[headersMap['productCategory']] = product.category;
            newRow[headersMap['productExpiry']] = product.expiry;

            // إضافة الكميات حسب الوحدات في أعمدة منفصلة
            for (const unit in product.units) {
                const quantityHeader = `productQuantity_${unit}`;
                if (headersMap.hasOwnProperty(quantityHeader)) {
                    newRow[headersMap[quantityHeader]] = product.units[unit];
                }
            }

            sheet.appendRow(newRow);
            rowsInserted++;
        });

        Logger.log(`✅ تم إدراج ${rowsInserted} صفوف بنجاح`);
        return ContentService.createTextOutput("Success");

    } catch (error) {
        Logger.log('⚠️ خطأ في معالجة الطلب: ' + error.message);
        return ContentService.createTextOutput("Error: An unexpected error occurred. Please check the Apps Script logs for details.");
    }
}

/**
 * دالة للتعامل مع طلبات GET البسيطة.
 */
function doGet(e) {
    return ContentService.createTextOutput('GET request received. Please use POST to submit data.');
}
