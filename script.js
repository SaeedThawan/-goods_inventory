// script.js
document.addEventListener("DOMContentLoaded", function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkdZ5k6EChKCDiNxKWXH6QjB4tZX7xX-T1Nn7hDNSRA_NI_KsXA7IF1Rpjq09Ow249zw/exec";
    
    const form = document.getElementById('visitForm');
    const statusMessage = document.getElementById('statusMessage');
    const customerNameInput = document.getElementById('customerNameInput');
    const customersDatalist = document.getElementById('customersList');
    const customerCodeInput = document.getElementById('customerCode');
    const submitBtn = document.getElementById('submitBtn');
    const addProductBtn = document.getElementById('addProductBtn');
    const productsContainer = document.getElementById('missingProductsContainer');
    const salesRepSelect = document.getElementById('salesRepName');
    const governorateSelect = document = document.getElementById('governorate');
    const visitDateInput = document.getElementById('visitDate');
    const visitTimeInput = document.getElementById('visitTime');
    const exitTimeInput = document.getElementById('exitTime');

    let customersData = [];
    let allProductsData = [];
    let isSubmitting = false;

    // Fetch all required data
    Promise.all([
        fetch('sales_representatives.json').then(res => res.json()),
        fetch('customers_main.json').then(res => res.json()),
        fetch('products.json').then(res => res.json()),
        fetch('governorates.json').then(res => res.json()),
    ]).then(([salesReps, customers, products, governorates]) => {
        // Populate Sales Reps
        salesReps.forEach(rep => {
            const option = document.createElement('option');
            option.value = rep;
            option.textContent = rep;
            salesRepSelect.appendChild(option);
        });

        // Populate Governorates
        governorates.forEach(gov => {
            const option = document.createElement('option');
            option.value = gov;
            option.textContent = gov;
            governorateSelect.appendChild(option);
        });

        // Store fetched data
        customersData = customers;
        allProductsData = products;

        // Populate the initial customer list. We will not filter by governorate here.
        populateCustomersList(customersData);
        
        // Add the initial product entry after data is loaded
        productsContainer.appendChild(createProductEntry());

        // Add event listeners for dynamic data
        governorateSelect.addEventListener('change', () => {
            customerNameInput.value = '';
            customerCodeInput.value = '';
            // We will re-populate the *full* list here, as the JSON file lacks governorate data
            populateCustomersList(customersData);
        });

        customerNameInput.addEventListener('input', () => {
            const selectedOption = customersDatalist.querySelector(`option[value="${customerNameInput.value}"]`);
            if (selectedOption) {
                customerCodeInput.value = selectedOption.dataset.code;
            } else {
                customerCodeInput.value = '';
            }
        });

        // This is the missing part of the code
        addProductBtn.addEventListener('click', () => {
            productsContainer.appendChild(createProductEntry());
        });

    }).catch(error => {
        console.error('Failed to load data files:', error);
        statusMessage.textContent = '❌ فشل تحميل البيانات الأساسية. يرجى التحقق من الملفات.';
        statusMessage.className = 'status error';
    });

    // Modified function to populate customers without filtering
    function populateCustomersList(customersToPopulate) {
        customersDatalist.innerHTML = '';
        customersToPopulate.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.Customer_Name_AR;
            option.dataset.code = customer.Customer_Code;
            customersDatalist.appendChild(option);
        });
    }

    // Function to create a new product entry
    function createProductEntry() {
        const productEntry = document.createElement('div');
        productEntry.classList.add('product-entry');
        productEntry.innerHTML = `
            <button type="button" class="remove-product-btn">X</button>
            <div class="form-group">
                <label>اختر المنتج:</label>
                <select class="productName" required></select>
                <input type="hidden" class="productCode">
                <input type="hidden" class="productCategory">
            </div>
            <div class="form-group">
                <label>الكمية:</label>
                <input type="number" class="productQuantity" min="1" required>
            </div>
            <div class="form-group">
                <label>الوحدة:</label>
                <select class="productUnit" required>
                    <option value="">اختر وحدة</option>
                    <option value="كرتون">كرتون</option>
                    <option value="علبة">علبة</option>
                    <option value="حبة">حبة</option>
                </select>
            </div>
            <div class="form-group">
                <label>تاريخ الانتهاء:</label>
                <input type="date" class="productExpiry" required>
            </div>
        `;

        const productNameSelect = productEntry.querySelector('.productName');
        const productCodeInput = productEntry.querySelector('.productCode');
        const productCategoryInput = productEntry.querySelector('.productCategory');

        // Add default empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'اختر منتج';
        productNameSelect.appendChild(emptyOption);

        allProductsData.forEach(product => {
            const option = document.createElement('option');
            option.value = product.Product_Name_AR;
            option.textContent = product.Product_Name_AR;
            option.dataset.code = product.Product_Code;
            option.dataset.category = product.Category;
            productNameSelect.appendChild(option);
        });

        productNameSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            if (selectedOption) {
                productCodeInput.value = selectedOption.dataset.code || '';
                productCategoryInput.value = selectedOption.dataset.category || '';
            }
        });

        productEntry.querySelector('.remove-product-btn').addEventListener('click', () => {
            productEntry.remove();
        });

        return productEntry;
    }
    
    // Star rating functionality
    const starRatingContainer = document.getElementById('storeRating');
    const ratingValueInput = document.getElementById('ratingValue');

    starRatingContainer.addEventListener('click', (e) => {
        if (e.target.matches('span')) {
            const value = e.target.dataset.value;
            ratingValueInput.value = value;
            Array.from(starRatingContainer.children).forEach(star => {
                if (star.dataset.value <= value) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        if (isSubmitting) return;
        isSubmitting = true;
        submitBtn.disabled = true;
        
        statusMessage.textContent = 'جاري الإرسال...';
        statusMessage.className = 'status submitting';

        // Collect data from standard form fields
        const data = {
            dataEntryName: document.getElementById('dataEntryName').value,
            salesRepName: document.getElementById('salesRepName').value,
            governorate: document.getElementById('governorate').value,
            customerName: customerNameInput.value,
            customerCode: customerCodeInput.value,
            visitDate: visitDateInput.value,
            visitTime: visitTimeInput.value,
            exitTime: exitTimeInput.value,
            storeRating: ratingValueInput.value,
            suggestions: document.getElementById('suggestions').value,
        };

        // Manually collect data from dynamic product entries
        const productEntries = productsContainer.querySelectorAll('.product-entry');
        const products = [];
        productEntries.forEach(entry => {
            const productName = entry.querySelector('.productName').value;
            if (productName) {
                products.push({
                    name: productName,
                    code: entry.querySelector('.productCode').value,
                    category: entry.querySelector('.productCategory').value,
                    quantity: entry.querySelector('.productQuantity').value,
                    unit: entry.querySelector('.productUnit').value,
                    expiry: entry.querySelector('.productExpiry').value,
                });
            }
        });
        // Pass products as a stringified JSON object
        data.products = JSON.stringify(products);
        
        // Add geolocation data
        if ("geolocation" in navigator) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
                });
                data.latitude = position.coords.latitude;
                data.longitude = position.coords.longitude;
            } catch (error) {
                console.error("Geolocation error:", error);
                data.latitude = "Location not available";
                data.longitude = "Location not available";
            }
        } else {
            data.latitude = "Geolocation not supported";
            data.longitude = "Geolocation not supported";
        }

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: new URLSearchParams(data),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
            });

            const result = await response.text();
            if (result.includes("Success")) {
                statusMessage.textContent = '✅ تم إرسال البيانات بنجاح!';
                statusMessage.className = 'status success';
                form.reset();
                customerCodeInput.value = '';
                ratingValueInput.value = '';
                Array.from(starRatingContainer.children).forEach(star => star.classList.remove('active'));
                // Clear dynamic product entries and add one again
                productsContainer.innerHTML = '';
                productsContainer.appendChild(createProductEntry());
            } else {
                statusMessage.textContent = `❌ حدث خطأ: ${result}`;
                statusMessage.className = 'status error';
            }
        } catch (error) {
            console.error('Submission error:', error);
            statusMessage.textContent = '❌ فشل الإرسال. يرجى التحقق من اتصالك بالإنترنت.';
            statusMessage.className = 'status error';
        } finally {
            isSubmitting = false;
            submitBtn.disabled = false;
        }
    });
    
    // Set today's date and time as default values
    const today = new Date();
    const dateFormatted = today.toISOString().split('T')[0];
    const timeFormatted = today.toTimeString().split(' ')[0].substring(0, 5);
    visitDateInput.value = dateFormatted;
    visitTimeInput.value = timeFormatted;
});
